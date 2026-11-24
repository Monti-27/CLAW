import { createSynth, type HoistMode, ONE_SHOTS, type SoundName, type Synth } from "./synth";

const MASTER = 0.7;

type Engine = {
  ctx: AudioContext;
  master: GainNode;
  synth: Synth;
  /** recorded files that replace the synth version, keyed by sound name */
  samples: Partial<Record<SoundName, AudioBuffer>>;
};

let engine: Engine | null = null;
let muted = false;

/**
 * Optional recorded samples. public/sfx/manifest.json maps a sound name to a
 * file in that folder, e.g. { "win": "win.mp3" }. Anything listed replaces
 * the synthesized version; anything missing keeps it.
 */
async function loadSamples(e: Engine) {
  try {
    const res = await fetch("/sfx/manifest.json");
    if (!res.ok) return;
    const manifest = (await res.json()) as Record<string, string>;
    await Promise.all(
      ONE_SHOTS.filter((name) => manifest[name]).map(async (name) => {
        const file = await fetch(`/sfx/${manifest[name]}`);
        if (file.ok) e.samples[name] = await e.ctx.decodeAudioData(await file.arrayBuffer());
      }),
    );
  } catch {
    // no manifest or a bad file: the synth covers everything
  }
}

/** Browsers only allow audio after a gesture, so this runs on the first click or key. */
export function unlockAudio() {
  if (engine) {
    if (engine.ctx.state === "suspended") void engine.ctx.resume();
    return;
  }
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER;
  // a gentle limiter so stacked sounds never clip
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.ratio.value = 6;
  master.connect(limiter).connect(ctx.destination);
  engine = { ctx, master, synth: createSynth(ctx, master), samples: {} };
  void loadSamples(engine);
}

export function setMuted(next: boolean) {
  muted = next;
  if (engine) engine.master.gain.setTargetAtTime(next ? 0 : MASTER, engine.ctx.currentTime, 0.03);
}

export function play(name: SoundName, delay = 0) {
  if (!engine) return;
  const sample = engine.samples[name];
  if (!sample) {
    engine.synth.play(name, delay);
    return;
  }
  const src = engine.ctx.createBufferSource();
  src.buffer = sample;
  src.connect(engine.master);
  src.start(engine.ctx.currentTime + delay);
}

export const gantry = (on: boolean) => engine?.synth.gantry(on);
export const hoist = (mode: HoistMode) => engine?.synth.hoist(mode);

/**
 * Renders every one-shot offline and reports its level, so the synth can be
 * checked without speakers: nothing silent, nothing clipping, nothing NaN.
 */
export async function measureSounds() {
  const report: Record<string, { peak: number; rms: number }> = {};
  for (const name of ONE_SHOTS) {
    const off = new OfflineAudioContext(1, 44100 * 3, 44100);
    createSynth(off, off.destination).play(name);
    const data = (await off.startRendering()).getChannelData(0);
    let peak = 0;
    let sum = 0;
    for (const v of data) {
      peak = Math.max(peak, Math.abs(v));
      sum += v * v;
    }
    report[name] = {
      peak: Number(peak.toFixed(3)),
      rms: Number(Math.sqrt(sum / data.length).toFixed(4)),
    };
  }
  return report;
}
