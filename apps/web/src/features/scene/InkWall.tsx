"use client";

import { useEffect, useMemo } from "react";
import { BackSide, CanvasTexture, LinearMipmapLinearFilter, ShaderMaterial, SRGBColorSpace } from "three";
import { mood } from "./mood";

/** The wall wraps the hall at this radius (m); the floor reflects it by hitting the same cylinder. */
export const WALL_R = 11;
/** Where the sign sits: centred behind the title shot, upper band of the frame. */
/** centred straight behind the machine in the title shot, in the band above its marquee */
const SIGN = { theta: -2.71, arc: 0.92, y0: 2.45, h: 1.68 };

/**
 * GLSL shared by the wall and the floor (which shows its reflection).
 * Ink drifting behind fluted glass, the same idea as the boot screen in its
 * dark key: void and plum, with the hall's tint glowing through where the ink
 * thins. Every rib refracts the ink and the sign behind it sideways.
 */
export const WALL_GLSL = /* glsl */ `
  uniform float uTime; uniform float uEnergy; uniform float uPace;
  uniform vec3 uTint; uniform sampler2D uSign; uniform vec4 uSignRect;
  const float WALL_R = ${WALL_R.toFixed(1)};

  float w_sq(float x) { return x * x; }
  float w_hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float w_noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(w_hash(i), w_hash(i + vec2(1, 0)), u.x), mix(w_hash(i + vec2(0, 1)), w_hash(i + vec2(1, 1)), u.x), u.y);
  }
  float w_fbm(vec2 p) {
    float v = 0.0; float a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 3; i++) { v += a * w_noise(p); p = m * p; a *= 0.42; }
    return v / 0.8;
  }
  float w_field(vec2 p, float t) {
    vec2 q = vec2(w_fbm(p * 0.9 + vec2(t * 0.045, t * 0.02)), w_fbm(p * 0.9 + vec2(5.2, 1.3) - vec2(t * 0.03, t * 0.04)));
    vec2 r = vec2(w_fbm(p + 1.5 * q + vec2(1.7, 9.2) + t * 0.025), w_fbm(p + 1.5 * q + vec2(8.3, 2.8) - t * 0.02));
    return w_fbm(p * 0.8 + 1.4 * r);
  }
  float w_wrap(float a) { return atan(sin(a), cos(a)); }

  /** Colour of the wall at angle theta (atan2(x, z)) and height y. */
  vec3 wallColor(float theta, float y) {
    float s = theta * WALL_R;
    const float RIB = 0.3;
    float rib = fract(s / RIB) - 0.5;
    float id = floor(s / RIB);
    // fluted glass: each rib shifts what's behind it sideways
    float sr = s + rib * RIB * 2.2;

    float v = w_field(vec2(sr * 0.085, y * 0.1 - uTime * 0.004), uTime * 0.5);
    float d = smoothstep(0.5, 0.95, v);
    // mostly void and plum; the hall's tint only glows through where the ink is thickest
    vec3 col = mix(vec3(0.003, 0.0018, 0.0045), vec3(0.018, 0.006, 0.017), smoothstep(0.0, 0.55, d));
    col = mix(col, uTint * (0.04 + 0.04 * uEnergy), smoothstep(0.5, 0.82, d));
    col = mix(col, uTint * (0.24 + 0.3 * uEnergy), smoothstep(0.86, 1.0, d));

    // the sign behind the glass: the same ribs, a gentler shift so it stays legible.
    // (seen from inside the cylinder the angle runs right to left, hence the flip)
    float th = (s + rib * RIB * 0.45) / WALL_R;
    vec2 su = vec2(0.5 - w_wrap(th - uSignRect.x) / uSignRect.y, (y - uSignRect.z) / uSignRect.w);
    float inside = step(0.0, su.x) * step(su.x, 1.0) * step(0.0, su.y) * step(su.y, 1.0);
    float sharp = texture(uSign, su).a * inside;
    float glow = texture(uSign, su, 5.0).a * inside;
    col += vec3(1.0, 0.9, 0.95) * sharp * (0.26 + 0.18 * uEnergy);
    col += uTint * glow * (0.12 + 0.18 * uEnergy);

    // light catching each rib; a sliver of neon set in every 18th one, pulsing round the hall
    col *= 1.0 + rib * 0.3;
    col += vec3(1.0, 0.85, 0.92) * smoothstep(0.46, 0.5, abs(rib)) * 0.006;
    if (mod(id, 18.0) == 0.0) {
      float wave = 0.5 + 0.5 * sin(theta * 3.0 - uTime * 0.6 * uPace);
      float aa = fwidth(rib) * 1.5;
      float core = 1.0 - smoothstep(0.06 - aa, 0.06 + aa, abs(rib));
      float halo = exp(-abs(rib) * 14.0) * 0.35;
      col += uTint * (core + halo) * (0.16 + wave * wave * (0.5 + uEnergy)) * smoothstep(0.0, 1.5, y) * smoothstep(7.0, 2.5, y);
    }

    // lit from the stage below, falling away into the dark above
    col += uTint * 0.025 * (0.4 + uEnergy) * exp(-max(y, 0.0) * 0.7);
    col *= smoothstep(13.0, 3.5, y);
    return col;
  }
`;

const OUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/** "claw × magicblock", painted once (and again when the UI font lands) for the sign behind the glass. */
function paintSign(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  // measure at a reference size, then scale so the lockup fills 90% of the width with no clipping
  const ref = 100;
  ctx.font = `600 ${ref}px Geist, system-ui, sans-serif`;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${-ref * 0.055}px`;
  const refW = ctx.measureText("claw").width + ctx.measureText("magicblock").width;
  ctx.font = `300 ${ref}px Geist, system-ui, sans-serif`;
  const refX = ctx.measureText("×").width;
  const refTotal = ref * 0.74 + ref * 0.2 + refW + ref * 0.34 * 2 + refX;
  const size = Math.min(h * 0.62, ((w * 0.9) / refTotal) * ref);
  const base = h * 0.5 + size * 0.36;
  const font = (weight: number) => `${weight} ${size}px Geist, system-ui, sans-serif`;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${-size * 0.055}px`;

  ctx.font = font(600);
  const left = "claw";
  const right = "magicblock";
  ctx.font = font(300);
  const xw = ctx.measureText("×").width;
  ctx.font = font(600);
  const lw = ctx.measureText(left).width;
  const rw = ctx.measureText(right).width;
  const gap = size * 0.34;
  // the claw mark leads the lockup: an open ring of dots holding the prize
  const markW = size * 0.74;
  const total = markW + size * 0.2 + lw + gap + xw + gap + rw;
  let x = (w - total) / 2;

  const mark = { cx: x + markW / 2, cy: base - size * 0.37, R: size * 0.33 };
  [
    [-128, 2.7],
    [-86, 2.3],
    [-43, 1.95],
    [0, 1.7],
    [43, 1.95],
    [86, 2.3],
    [128, 2.7],
  ].forEach(([a, r]) => {
    const t = ((a ?? 0) * Math.PI) / 180;
    ctx.beginPath();
    ctx.arc(mark.cx + Math.sin(t) * mark.R, mark.cy - Math.cos(t) * mark.R, ((r ?? 2) / 10.6) * mark.R, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(mark.cx, mark.cy + mark.R * 0.63, (3.9 / 10.6) * mark.R, 0, Math.PI * 2);
  ctx.fill();
  x += markW + size * 0.2;

  ctx.fillText(left, x, base);
  x += lw + gap;
  ctx.globalAlpha = 0.6;
  ctx.font = font(300);
  ctx.fillText("×", x, base);
  ctx.globalAlpha = 1;
  x += xw + gap;
  ctx.font = font(600);
  ctx.fillText(right, x, base);
}

function useSign() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 3072;
    canvas.height = 512;
    paintSign(canvas);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearMipmapLinearFilter;
    t.anisotropy = 8;
    return t;
  }, []);
  useEffect(() => {
    let alive = true;
    document.fonts
      .load("600 120px Geist")
      .then(() => {
        if (!alive) return;
        paintSign(texture.image as HTMLCanvasElement);
        texture.needsUpdate = true;
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      texture.dispose();
    };
  }, [texture]);
  return texture;
}

export function wallUniforms(sign: CanvasTexture) {
  return {
    uTime: mood.time,
    uEnergy: mood.energy,
    uPace: mood.pace,
    uTint: { value: mood.tint },
    uSign: { value: sign },
    uSignRect: { value: [SIGN.theta, SIGN.arc, SIGN.y0, SIGN.h] },
  };
}

/** The curved wall of fluted glass with ink behind it, all the way round the hall. */
export function InkWall({ sign, floorY }: { sign: CanvasTexture; floorY: number }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        fog: false,
        uniforms: wallUniforms(sign),
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          ${WALL_GLSL}
          varying vec3 vWorld;
          void main() {
            vec3 col = wallColor(atan(vWorld.x, vWorld.z), vWorld.y);
            gl_FragColor = vec4(col, 1.0);
            ${OUT}
          }`,
      }),
    [sign],
  );
  return (
    <mesh position={[0, floorY + 8, 0]} material={material} renderOrder={-5}>
      <cylinderGeometry args={[WALL_R, WALL_R, 16, 96, 1, true]} />
    </mesh>
  );
}

export { useSign };
