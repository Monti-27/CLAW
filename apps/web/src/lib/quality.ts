/**
 * Picks a render tier from what the GPU and device report, so a phone or an
 * office laptop never gets the full desktop pipeline. ?quality=low|mid|high
 * in the URL forces a tier for testing.
 */
export type Tier = "low" | "mid" | "high";

export type Profile = {
  /**
   * device pixel ratio range; PerformanceMonitor moves inside it. The top is a
   * ceiling: the renderer goes as high as the screen (and any browser or pinch
   * zoom) needs, up to it and to `pixels`.
   */
  dpr: [number, number];
  /** most pixels the canvas may draw per frame, so zooming in can't melt the GPU */
  pixels: number;
  shadows: boolean;
  shadowMap: number;
  /** update the shadow map every Nth frame */
  shadowEvery: number;
  post: boolean;
  msaa: number;
  bloomScale: number;
  clearcoat: boolean;
  dust: number;
  confetti: number;
};

export const PROFILES: Record<Tier, Profile> = {
  low: {
    dpr: [0.7, 1.25],
    pixels: 2.6e6,
    shadows: false,
    shadowMap: 512,
    shadowEvery: 1,
    post: false,
    msaa: 0,
    bloomScale: 0.5,
    clearcoat: false,
    dust: 24,
    confetti: 90,
  },
  mid: {
    dpr: [1, 3],
    pixels: 9e6,
    shadows: true,
    shadowMap: 1024,
    shadowEvery: 2,
    post: true,
    msaa: 4,
    bloomScale: 0.5,
    clearcoat: true,
    dust: 60,
    confetti: 160,
  },
  high: {
    dpr: [1, 4],
    pixels: 14e6,
    shadows: true,
    shadowMap: 1536,
    shadowEvery: 1,
    post: true,
    msaa: 4,
    bloomScale: 0.75,
    clearcoat: true,
    dust: 110,
    confetti: 220,
  },
};

const forced = (): Tier | null => {
  const q = new URLSearchParams(window.location.search).get("quality");
  return q === "low" || q === "mid" || q === "high" ? q : null;
};

/** null means the browser cannot run WebGL2 at all. */
export function detectTier(): Tier | null {
  let renderer = "";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false });
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    renderer = String(
      ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    ).toLowerCase();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    return null;
  }

  const f = forced();
  if (f) return f;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  const touch = window.matchMedia("(pointer: coarse)").matches;

  // no real GPU: software rasterizers, remote desktops, blocklisted drivers
  if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(renderer)) {
    return "low";
  }
  if (cores <= 4 || memory <= 4) return "low";

  if (touch) {
    // recent iPhones/iPads and flagship Adreno/Mali can take the mid pipeline
    const strongMobile = /apple|adreno \(tm\) (7[3-9]\d|8\d\d)|mali-g(7[1-9]|[89]\d|7\d\d)|immortalis/.test(
      renderer,
    );
    return strongMobile && memory >= 6 ? "mid" : "low";
  }

  const discrete = /nvidia|geforce|rtx|gtx|quadro|radeon (rx|pro)|amd radeon|arc a|apple m\d (pro|max|ultra)/.test(
    renderer,
  );
  if (discrete) return "high";
  // Apple base M chips and Iris Xe are capable but drive dense retina screens
  if (/apple|iris xe|radeon/.test(renderer)) return "mid";
  // older Intel HD/UHD integrated graphics
  if (/intel/.test(renderer)) return "low";
  return "mid";
}
