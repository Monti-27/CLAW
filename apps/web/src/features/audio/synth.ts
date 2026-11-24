/**
 * Every sound in the game, built from oscillators and filtered noise so the
 * machine ships with no audio files. Modeled on what a real crane game makes:
 * microswitch clicks, a gear motor on the gantry, a hoist motor on the cable,
 * a solenoid clamp, things landing, and the cabinet's own jingles.
 *
 * Works on a live AudioContext and on an OfflineAudioContext (used to test).
 */

export const ONE_SHOTS = [
  "press",
  "release",
  "coin",
  "start",
  "clamp",
  "open",
  "thud",
  "chute",
  "win",
  "lose",
  "door",
  "ding",
  "tick",
] as const;
export type SoundName = (typeof ONE_SHOTS)[number];
export type HoistMode = "off" | "down" | "up";

type ToneOpts = {
  type?: OscillatorType;
  freq: number;
  /** glide to this frequency over the note */
  to?: number;
  at: number;
  dur: number;
  gain: number;
  attack?: number;
  dest?: AudioNode;
};
type BurstOpts = {
  at: number;
  dur: number;
  gain: number;
  filter: BiquadFilterType;
  freq: number;
  to?: number;
  q?: number;
  dest?: AudioNode;
};

/** C major pentatonic, the cabinet's only scale. */
const NOTE = {
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
};

function noiseBuffer(ctx: BaseAudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** A small room: decaying noise as the impulse response. */
function roomImpulse(ctx: BaseAudioContext, seconds: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  return buf;
}

export function createSynth(ctx: BaseAudioContext, out: AudioNode) {
  const noise = noiseBuffer(ctx);

  const room = ctx.createConvolver();
  room.buffer = roomImpulse(ctx, 1.3);
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  room.connect(wet).connect(out);

  const tone = (o: ToneOpts) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.freq, o.at);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, o.at + o.dur);
    g.gain.setValueAtTime(0.0001, o.at);
    g.gain.exponentialRampToValueAtTime(o.gain, o.at + (o.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);
    osc.connect(g).connect(o.dest ?? out);
    osc.start(o.at);
    osc.stop(o.at + o.dur + 0.02);
  };

  const burst = (o: BurstOpts) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.filter;
    f.frequency.setValueAtTime(o.freq, o.at);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, o.at + o.dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.gain, o.at);
    g.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);
    src
      .connect(f)
      .connect(g)
      .connect(o.dest ?? out);
    src.start(o.at, Math.random() * 0.5);
    src.stop(o.at + o.dur + 0.02);
  };

  /** Struck metal: a few inharmonic partials ringing out. */
  const ping = (at: number, base: number, gain: number, dur: number, dest: AudioNode = out) => {
    for (const [ratio, level] of [
      [1, 1],
      [2.76, 0.45],
      [5.4, 0.22],
    ] as const) {
      tone({
        freq: base * ratio,
        at,
        dur: dur / Math.sqrt(ratio),
        gain: gain * level,
        attack: 0.001,
        dest,
      });
    }
  };

  /** One voice of the cabinet's speaker: triangle body with a little square edge. */
  const chip = (at: number, freq: number, dur: number, gain: number) => {
    tone({ type: "triangle", freq, at, dur, gain, attack: 0.006 });
    tone({ type: "square", freq, at, dur: dur * 0.7, gain: gain * 0.16, attack: 0.006 });
    tone({
      type: "triangle",
      freq,
      at,
      dur: dur * 1.4,
      gain: gain * 0.5,
      attack: 0.006,
      dest: room,
    });
  };

  const shots: Record<SoundName, (at: number) => void> = {
    // arcade pushbutton: the microswitch tick, then the plunger bottoming out
    press: (at) => {
      burst({ at, dur: 0.012, gain: 0.5, filter: "bandpass", freq: 3200, q: 1.4 });
      tone({ freq: 190, to: 110, at: at + 0.004, dur: 0.05, gain: 0.3 });
    },
    release: (at) => {
      burst({ at, dur: 0.01, gain: 0.22, filter: "bandpass", freq: 4200, q: 1.6 });
    },
    // credit accepted: coin on metal, then the mech's two-ping acknowledge
    coin: (at) => {
      burst({ at, dur: 0.03, gain: 0.3, filter: "highpass", freq: 3000 });
      ping(at + 0.01, 1480, 0.2, 0.5, room);
      ping(at + 0.01, 1480, 0.16, 0.35);
      ping(at + 0.11, 1975, 0.18, 0.6);
    },
    start: (at) => {
      [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => {
        chip(at + i * 0.075, f, 0.22, 0.16);
      });
    },
    // solenoid pulls the fingers shut: a dull clack with a short metal ring
    clamp: (at) => {
      tone({ freq: 130, to: 70, at, dur: 0.09, gain: 0.55 });
      burst({ at, dur: 0.035, gain: 0.5, filter: "lowpass", freq: 1800 });
      ping(at + 0.005, 2300, 0.06, 0.28);
    },
    open: (at) => {
      burst({ at, dur: 0.02, gain: 0.28, filter: "bandpass", freq: 2200, q: 1.2 });
      tone({ freq: 160, to: 120, at, dur: 0.05, gain: 0.2 });
    },
    // a prize dropping back onto the pile
    thud: (at) => {
      tone({ freq: 110, to: 55, at, dur: 0.16, gain: 0.6 });
      burst({ at, dur: 0.07, gain: 0.35, filter: "lowpass", freq: 900 });
      burst({ at: at + 0.09, dur: 0.05, gain: 0.12, filter: "bandpass", freq: 1500, q: 0.8 });
    },
    // the prize tumbling down the chute into the bin
    chute: (at) => {
      [0, 0.13, 0.23, 0.31].forEach((d, i) => {
        const g = 0.5 * 0.68 ** i;
        tone({ freq: 150 - i * 12, to: 70, at: at + d, dur: 0.1, gain: g });
        burst({
          at: at + d,
          dur: 0.05,
          gain: g * 0.6,
          filter: "bandpass",
          freq: 1100 + i * 250,
          q: 0.9,
        });
      });
    },
    // the win jingle: a rising run, a held chord, then sparkles
    win: (at) => {
      const run = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6];
      run.forEach((f, i) => {
        chip(at + i * 0.085, f, 0.2, 0.17);
      });
      const chord = at + run.length * 0.085;
      for (const f of [NOTE.C5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6]) chip(chord, f, 0.9, 0.1);
      const sparkle = [NOTE.G6, NOTE.E6, NOTE.A5, NOTE.D6, NOTE.C6, NOTE.G6, NOTE.E6, NOTE.D6];
      sparkle.forEach((f, i) => {
        ping(chord + 0.35 + i * 0.13, f * 2, 0.045, 0.5, room);
      });
    },
    // the classic two-note "aww", kept soft
    lose: (at) => {
      chip(at, 392, 0.26, 0.12);
      chip(at + 0.22, 293.66, 0.5, 0.12);
    },
    // prize bin: a small servo swinging the flap, then the latch
    door: (at) => {
      const g = ctx.createGain();
      g.gain.value = 1.6;
      g.connect(out);
      tone({
        type: "sawtooth",
        freq: 240,
        to: 420,
        at,
        dur: 0.45,
        gain: 0.06,
        attack: 0.04,
        dest: g,
      });
      burst({ at, dur: 0.45, gain: 0.05, filter: "bandpass", freq: 2600, to: 3600, q: 6, dest: g });
      burst({ at: at + 0.46, dur: 0.02, gain: 0.3, filter: "bandpass", freq: 2000, q: 1.2 });
    },
    ding: (at) => {
      ping(at, NOTE.G6, 0.2, 1.4, room);
      ping(at, NOTE.G6, 0.14, 0.9);
      ping(at + 0.12, NOTE.C6 * 2, 0.12, 1.2, room);
    },
    tick: (at) => {
      tone({ freq: 1150, at, dur: 0.045, gain: 0.18, attack: 0.001 });
      burst({ at, dur: 0.008, gain: 0.12, filter: "highpass", freq: 5000 });
    },
  };

  /**
   * A small DC gear motor: sawtooth core, a higher partial for gear whine,
   * chatter from a fast tremolo, brush hiss from filtered noise.
   */
  function motor(base: number, level: number) {
    const mix = ctx.createGain();
    mix.gain.value = 0;
    const body = ctx.createBiquadFilter();
    body.type = "lowpass";
    body.frequency.value = 1100;

    const core = ctx.createOscillator();
    core.type = "sawtooth";
    core.frequency.value = base;
    const whine = ctx.createOscillator();
    whine.type = "square";
    whine.frequency.value = base * 6.03;
    const whineGain = ctx.createGain();
    whineGain.gain.value = 0.12;

    const chatter = ctx.createGain();
    chatter.gain.value = 0.8;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 31;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.2;
    lfo.connect(lfoDepth).connect(chatter.gain);

    const hiss = ctx.createBufferSource();
    hiss.buffer = noise;
    hiss.loop = true;
    const hissBand = ctx.createBiquadFilter();
    hissBand.type = "bandpass";
    hissBand.frequency.value = 2400;
    hissBand.Q.value = 2.5;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.25;

    core.connect(body);
    whine.connect(whineGain).connect(body);
    body.connect(chatter).connect(mix);
    hiss.connect(hissBand).connect(hissGain).connect(mix);
    mix.connect(out);
    for (const n of [core, whine, lfo, hiss]) n.start();

    return (on: boolean, pitch = 1) => {
      const t = ctx.currentTime;
      mix.gain.setTargetAtTime(on ? level : 0, t, on ? 0.035 : 0.06);
      core.frequency.setTargetAtTime(base * pitch, t, 0.08);
      whine.frequency.setTargetAtTime(base * 6.03 * pitch, t, 0.08);
    };
  }

  const gantryMotor = motor(92, 0.085);
  const hoistMotor = motor(64, 0.1);

  return {
    play: (name: SoundName, delay = 0) => shots[name](ctx.currentTime + delay),
    /** trolley running along the rails */
    gantry: (on: boolean) => gantryMotor(on),
    /** cable motor: paying out sounds lower, hauling a load sounds strained */
    hoist: (mode: HoistMode) => hoistMotor(mode !== "off", mode === "up" ? 1.32 : 1),
  };
}

export type Synth = ReturnType<typeof createSynth>;
