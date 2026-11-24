"use client";

import { type RefObject, useEffect, useRef } from "react";

/** What the boot screen can ask of the shader. */
export type InkApi = {
  /** fall into the dark core over `seconds`, starting after `delay` */
  dive: (seconds: number, delay: number) => void;
  /** the next frame, as a bitmap (null if the browser can't hand one over) */
  snapshot: () => Promise<ImageBitmap | null>;
  /**
   * Flood the screen with liquid from (x, y) in CSS pixels, then open a hole
   * through it onto whatever is underneath. Times in seconds.
   */
  portal: (p: { x: number; y: number; flood: number; holeAt: number; hole: number }) => void;
};

type PortalMsg = { x: number; y: number; flood: number; holeAt: number; hole: number };

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

/*
 * Ink drifting through fluted glass. A slow domain-warped field is mapped
 * through the brand ramp (paper, blush, hot pink, berry, void); vertical
 * ribs refract it sideways in a band across the middle, which is where the
 * stripes come from. A fine grain keeps the gradients from banding.
 */
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uIntro;
uniform float uDive;
uniform float uRib;
// the portal: liquid floods out from uCenter (uv), then a hole tears open in it onto the arena
uniform vec2 uCenter;
uniform float uFlood;
uniform float uHole;
uniform float uMaxR;
out vec4 outColor;

float sq(float x) { return x * x; }
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = m * p; a *= 0.42; }
  return v / 0.8;
}
// big, slow, smooth shapes: low frequency and a gentle two-step warp
float field(vec2 p, float t) {
  vec2 q = vec2(fbm(p * 0.9 + vec2(t * 0.045, t * 0.02)), fbm(p * 0.9 + vec2(5.2, 1.3) - vec2(t * 0.03, t * 0.04)));
  vec2 r = vec2(fbm(p + 1.5 * q + vec2(1.7, 9.2) + t * 0.025),
                fbm(p + 1.5 * q + vec2(8.3, 2.8) - t * 0.02));
  return fbm(p * 0.8 + 1.4 * r);
}
vec3 ramp(float d) {
  vec3 c0 = vec3(0.957, 0.925, 0.937);
  vec3 c1 = vec3(0.976, 0.71, 0.82);
  vec3 c2 = vec3(0.91, 0.278, 0.561);
  vec3 c3 = vec3(0.4, 0.055, 0.23);
  vec3 c4 = vec3(0.047, 0.027, 0.059);
  vec3 c = mix(c0, c1, smoothstep(0.0, 0.3, d));
  c = mix(c, c2, smoothstep(0.24, 0.56, d));
  c = mix(c, c3, smoothstep(0.52, 0.8, d));
  c = mix(c, c4, smoothstep(0.76, 1.0, d));
  return c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float dive = smoothstep(0.0, 1.0, uDive);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  // fluted glass: strongest in a band through the middle, everywhere once diving
  float rib = fract(uv.x * uRib) - 0.5;
  float band = exp(-sq((uv.x - 0.46) / 0.22));
  band = mix(band, 1.0, dive);

  float zoom = mix(1.0, 0.1, dive * dive);
  vec2 ps = p * zoom;
  ps.x += rib * (aspect / uRib) * 2.2 * band * zoom * (1.0 + dive * 8.0);

  float v = field(ps * 0.7 + vec2(0.25, -0.1), uTime);
  float d = smoothstep(0.46, 0.86, v);
  // keep the deepest ink near the centre, where the mark sits
  d = clamp(d + exp(-dot(p, p) * 3.0) * 0.3 - 0.04, 0.0, 1.0);
  // the dive: darkness opens out from the centre
  d = max(d, smoothstep(0.0, 0.35, dive * 1.7 - length(p) * 1.1));

  vec3 col = ramp(d);
  // light catching each rib's edge
  col *= 1.0 + rib * 0.07 * band * smoothstep(0.05, 0.5, d);
  // grain
  col += (hash(gl_FragCoord.xy + fract(uTime * 7.0) * 91.0) - 0.5) * 0.028;

  col = mix(vec3(0.957, 0.925, 0.937), col, uIntro);
  col = mix(col, vec3(0.047, 0.027, 0.059), smoothstep(0.62, 1.0, dive));

  // ---- the portal
  float alpha = 1.0;
  if (uFlood > 0.0) {
    vec2 q = (uv - uCenter) * vec2(aspect, 1.0);
    float r = length(q);
    float ang = atan(q.y, q.x);
    float aa = fwidth(r) * 1.5;

    // glossy magenta flooding out of the capsule, its edge rippling like poured liquid
    // an organic, slowly churning edge (noise round the rim), calming as it fills the screen
    float wob = noise(vec2(cos(ang), sin(ang)) * 2.2 + uTime * 0.9) - 0.5;
    float rf = uFlood * uMaxR * (1.0 + 0.09 * wob * (1.0 - uFlood * 0.8));
    float flood = 1.0 - smoothstep(rf - aa, rf + aa, r);
    vec3 liquid = mix(vec3(1.0, 0.56, 0.82), vec3(0.83, 0.13, 0.52), smoothstep(0.75, 0.15, uv.y));
    liquid *= 1.0 + rib * 0.08;
    liquid += vec3(1.0, 0.85, 0.95) * 0.14 * exp(-sq((uv.y - 0.8) * 14.0));
    // depth in the flood: the light falls off toward the edges of the screen
    liquid *= 1.0 - 0.35 * smoothstep(0.3, 1.2, length((uv - 0.5) * vec2(aspect, 1.0)));
    col = mix(col, liquid, flood);
    col += vec3(1.0, 0.9, 0.96) * exp(-sq((r - rf) / 0.006)) * 0.8 * (1.0 - smoothstep(0.85, 1.0, uFlood));

    // the hole: transparent inside, a white-hot rim, warp streaks pulled outward around it
    if (uHole > 0.0) {
      float rh = uHole * uMaxR * 1.12;
      alpha = smoothstep(rh - aa, rh + aa * 2.0, r);
      float out_ = max(r - rh, 0.0);
      col += vec3(1.0, 0.86, 0.95) * exp(-out_ / 0.018) * 1.1;
      col += vec3(1.0, 0.5, 0.8) * exp(-out_ / 0.09) * 0.45;
      float streak = noise(vec2(ang * 14.0, r * 2.0 - uTime * 5.0));
      col += vec3(1.0, 0.7, 0.9) * pow(streak, 4.0) * exp(-out_ / 0.14) * 0.9;
    }
  }
  outColor = vec4(col * alpha, alpha);
}`;

/**
 * The renderer as plain JavaScript source, so the very same code can run in
 * a Web Worker on an OffscreenCanvas (untouched while the main thread loads
 * the game) or, where that isn't supported, on the page. It is a string on
 * purpose: bundlers and Fast Refresh never rewrite it.
 */
const ENGINE = String.raw`
function runInk(canvas, VERT, FRAG) {
  var gl = canvas.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" });
  if (!gl) return null;
  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn("[ink]", gl.getShaderInfoLog(sh)); return null; }
    return sh;
  }
  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var u = {
    res: gl.getUniformLocation(program, "uRes"),
    time: gl.getUniformLocation(program, "uTime"),
    intro: gl.getUniformLocation(program, "uIntro"),
    dive: gl.getUniformLocation(program, "uDive"),
    rib: gl.getUniformLocation(program, "uRib"),
    center: gl.getUniformLocation(program, "uCenter"),
    flood: gl.getUniformLocation(program, "uFlood"),
    hole: gl.getUniformLocation(program, "uHole"),
    maxR: gl.getUniformLocation(program, "uMaxR")
  };
  var portal = null;
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function easeIn(k) { return k * k * k; }
  var cssWidth = 1, diveStart = -1, diveSeconds = 1, running = true, snaps = [];
  var t0 = performance.now();
  var raf = typeof requestAnimationFrame === "function"
    ? function (cb) { requestAnimationFrame(cb); }
    : function (cb) { setTimeout(function () { cb(performance.now()); }, 16); };
  function frame(now) {
    if (!running) return;
    var t = (now - t0) / 1000;
    // ink is there from the first frame and settles in over a second and a half
    var e = Math.min(1, t / 1.5);
    var intro = 0.55 + 0.45 * (1 - Math.pow(1 - e, 3));
    var dive = 0;
    if (diveStart >= 0) {
      var k = Math.min(1, Math.max(0, (now - diveStart) / 1000 / diveSeconds));
      // slow start, then a rush
      dive = k === 0 ? 0 : Math.pow(2, 10 * k - 10);
    }
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.time, t + dive * 6);
    gl.uniform1f(u.intro, intro);
    gl.uniform1f(u.dive, dive);
    // one rib every ~15 CSS pixels, like the reference glass
    gl.uniform1f(u.rib, cssWidth / 15);
    var flood = 0, hole = 0;
    if (portal) {
      var pt = (now - portal.start) / 1000;
      flood = ease(Math.min(1, Math.max(0, pt / portal.flood)));
      // the hole starts slow, then rushes open: flying through it
      hole = easeIn(Math.min(1, Math.max(0, (pt - portal.holeAt) / portal.hole)));
      gl.uniform2f(u.center, portal.x, portal.y);
      var aspect = canvas.width / canvas.height;
      var dx = Math.max(portal.x, 1 - portal.x) * aspect, dy = Math.max(portal.y, 1 - portal.y);
      gl.uniform1f(u.maxR, Math.sqrt(dx * dx + dy * dy) * 1.02);
    }
    gl.uniform1f(u.flood, flood);
    gl.uniform1f(u.hole, hole);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // a snapshot has to be taken in the same task as the draw, before the buffer is presented
    if (snaps.length) {
      var waiting = snaps; snaps = [];
      createImageBitmap(canvas).then(function (b) { waiting.forEach(function (cb) { cb(b); }); }, function () { waiting.forEach(function (cb) { cb(null); }); });
    }
    raf(frame);
  }
  raf(frame);
  return {
    resize: function (width, height, css) { canvas.width = width; canvas.height = height; cssWidth = css; gl.viewport(0, 0, width, height); },
    dive: function (seconds, delay) { diveSeconds = seconds; diveStart = performance.now() + delay * 1000; },
    snap: function (cb) { snaps.push(cb); },
    portal: function (p) { portal = { start: performance.now(), x: p.x, y: p.y, flood: p.flood, holeAt: p.holeAt, hole: p.hole }; },
    stop: function () { running = false; gl.deleteBuffer(buf); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); }
  };
}
`;

/** Worker entry: wires messages to the engine. */
const WORKER = String.raw`
var ink = null;
self.onmessage = function (e) {
  var m = e.data;
  if (m.type === "init") ink = runInk(m.canvas, m.vert, m.frag);
  else if (m.type === "resize") ink && ink.resize(m.width, m.height, m.css);
  else if (m.type === "dive") ink && ink.dive(m.seconds, m.delay);
  else if (m.type === "stop") ink && ink.stop();
  else if (m.type === "portal") ink && ink.portal(m);
  else if (m.type === "snap") {
    if (!ink) return self.postMessage({ type: "snap", bmp: null });
    ink.snap(function (bmp) { self.postMessage({ type: "snap", bmp: bmp }, bmp ? [bmp] : []); });
  }
};
`;

type Ink = {
  resize: (width: number, height: number, css: number) => void;
  dive: (seconds: number, delay: number) => void;
  snap: (cb: (bmp: ImageBitmap | null) => void) => void;
  portal: (p: PortalMsg) => void;
  stop: () => void;
};
type Msg =
  | { type: "init"; canvas: OffscreenCanvas; vert: string; frag: string }
  | { type: "resize"; width: number; height: number; css: number }
  | { type: "dive"; seconds: number; delay: number }
  | { type: "stop" }
  | { type: "snap" }
  | ({ type: "portal" } & PortalMsg);

/** The same engine on the page, for browsers without OffscreenCanvas. */
const runLocalInk = (canvas: HTMLCanvasElement): Ink | null =>
  // biome-ignore lint/security/noGlobalEval: the engine is our own constant source, shared with the worker
  new Function(`${ENGINE}; return runInk;`)()(canvas, VERT, FRAG);
/** Fullscreen canvas running the boot shader, off the main thread wherever the browser allows. */
export function InkShader({ api }: { api: RefObject<InkApi | null> }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // a fresh canvas per mount: once handed to a worker, a canvas can never be drawn from here again
    const makeCanvas = () => {
      const c = document.createElement("canvas");
      c.className = "absolute inset-0 size-full";
      host.appendChild(c);
      return c;
    };
    // the field is soft, so it renders a little under native resolution; the ribs stay crisp
    const scale = Math.min(window.devicePixelRatio, 1.5) * 0.85;
    const size = (canvas: HTMLCanvasElement) => ({
      width: Math.max(1, Math.round(canvas.clientWidth * scale)),
      height: Math.max(1, Math.round(canvas.clientHeight * scale)),
      css: canvas.clientWidth || 1,
    });

    let worker: Worker | null = null;
    let local: Ink | null = null;
    let canvas = makeCanvas();
    /** Main-thread fallback: a fresh canvas (a transferred one can't be drawn from here). */
    const runLocal = () => {
      worker?.terminate();
      worker = null;
      canvas.remove();
      canvas = makeCanvas();
      local = runLocalInk(canvas);
      resize();
    };
    if ("transferControlToOffscreen" in canvas) {
      try {
        const src = `${ENGINE}\n${WORKER}`;
        const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
        worker = new Worker(url);
        URL.revokeObjectURL(url);
        worker.onerror = (e) => {
          console.warn("[ink] worker failed, drawing on the page instead:", e.message);
          runLocal();
        };
        const off = canvas.transferControlToOffscreen();
        worker.postMessage({ type: "init", canvas: off, vert: VERT, frag: FRAG } satisfies Msg, [off]);
      } catch {
        worker = null;
      }
    }
    if (!worker) local = runLocalInk(canvas);

    function resize() {
      const s = size(canvas);
      if (worker) worker.postMessage({ type: "resize", ...s } satisfies Msg);
      else local?.resize(s.width, s.height, s.css);
    }
    resize();
    const watch = new ResizeObserver(resize);
    watch.observe(host);

    const pending: ((b: ImageBitmap | null) => void)[] = [];
    if (worker) {
      worker.onmessage = (e: MessageEvent<{ type: string; bmp: ImageBitmap | null }>) => {
        if (e.data.type === "snap") for (const cb of pending.splice(0)) cb(e.data.bmp);
      };
    }
    api.current = {
      dive: (seconds, delay) => {
        if (worker) worker.postMessage({ type: "dive", seconds, delay } satisfies Msg);
        else local?.dive(seconds, delay);
      },
      portal: (p) => {
        // CSS pixels to the shader's uv (origin bottom-left)
        const r = host.getBoundingClientRect();
        const m: PortalMsg = {
          ...p,
          x: (p.x - r.left) / Math.max(1, r.width),
          y: 1 - (p.y - r.top) / Math.max(1, r.height),
        };
        if (worker) worker.postMessage({ type: "portal", ...m } satisfies Msg);
        else local?.portal(m);
      },
      snapshot: () =>
        new Promise((resolve) => {
          const done = setTimeout(() => resolve(null), 500);
          const cb = (b: ImageBitmap | null) => {
            clearTimeout(done);
            resolve(b);
          };
          if (worker) {
            pending.push(cb);
            worker.postMessage({ type: "snap" } satisfies Msg);
          } else if (local) local.snap(cb);
          else cb(null);
        }),
    };

    return () => {
      watch.disconnect();
      api.current = null;
      if (worker) {
        worker.postMessage({ type: "stop" } satisfies Msg);
        worker.terminate();
      }
      local?.stop();
      canvas.remove();
    };
  }, [api]);

  return <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />;
}
