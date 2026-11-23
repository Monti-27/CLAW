import {
  CircleGeometry,
  Color,
  ExtrudeGeometry,
  LatheGeometry,
  type Material,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { CAPSULE_R, GEM_R } from "./layout";

const r = CAPSULE_R;

/** A five-point star prism with a soft bevel: the toy sealed in each capsule. */
function starGeometry() {
  const s = new Shape();
  const outer = r * 0.4;
  const inner = r * 0.19;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 === 0 ? outer : inner;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  const g = new ExtrudeGeometry(s, {
    depth: r * 0.16,
    bevelEnabled: true,
    bevelThickness: r * 0.06,
    bevelSize: r * 0.05,
    bevelSegments: 2,
    curveSegments: 1,
  });
  g.center();
  return g;
}

/** A brilliant cut: table, crown, girdle and a pointed pavilion, faceted by the lathe's few sides. */
function gemGeometry() {
  const R = GEM_R;
  const profile = [
    [0, -R * 0.95],
    [R, -R * 0.05],
    [R, R * 0.05],
    [R * 0.62, R * 0.42],
    [0, R * 0.42],
  ].map(([x, y]) => new Vector2(x, y));
  // centred on its bounds, so it sits on its contact sphere
  return new LatheGeometry(profile, 8).translate(0, R * 0.265, 0);
}

/**
 * Plastic that brightens toward its silhouette, like a real clear dome: the
 * fresnel term lifts opacity at grazing angles, so the curve reads even when
 * the face-on part is nearly invisible.
 */
function fresnelDome(material: MeshPhysicalMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      /* glsl */ `#include <dithering_fragment>
      float fr = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.5);
      gl_FragColor.a = clamp(gl_FragColor.a + fr * 0.55, 0.0, 1.0);
      gl_FragColor.rgb += vec3(fr * 0.18);`,
    );
  };
  material.customProgramCacheKey = () => "claw-dome";
  return material;
}

function create() {
  const geometry = {
    base: new SphereGeometry(r, 30, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    dome: new SphereGeometry(r * 0.995, 30, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    floor: new CircleGeometry(r * 0.97, 32),
    lip: new TorusGeometry(r + 0.0008, 0.0032, 6, 32),
    toy: starGeometry(),
    gem: gemGeometry(),
  };
  const material = {
    // candy plastic: saturated, glossy, a clearcoat on top
    base: new MeshPhysicalMaterial({ roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3 }),
    floor: new MeshStandardMaterial({ roughness: 0.6 }),
    lip: new MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
    dome: fresnelDome(
      new MeshPhysicalMaterial({
        transparent: true,
        opacity: 0.16,
        roughness: 0.04,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 2.4,
        depthWrite: false,
      }),
    ),
    toy: new MeshStandardMaterial({ roughness: 0.38, metalness: 0.05 }),
  };
  return { geometry, material };
}

let cache: ReturnType<typeof create> | null = null;
export const capsuleKit = () => {
  cache ??= create();
  return cache;
};

/** Toy colours, picked to stand out against any base. */
export const TOY_COLORS = ["#fff7ea", "#ffd15c", "#ff8fc0", "#8ff0d0", "#ffffff"] as const;

/** Stable per-capsule picks from its id, so the pile and a grabbed capsule match. */
export function capsuleLook(id: string, color: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const u = (h >>> 0) / 4294967296;
  const base = new Color(color);
  return {
    base,
    floor: base.clone().multiplyScalar(0.62),
    dome: base.clone().lerp(new Color("#ffffff"), 0.72),
    toy: new Color(TOY_COLORS[Math.floor(u * TOY_COLORS.length)] ?? "#fff"),
    /** toy's tilt and spin inside the capsule */
    toyTurn: [u * 6.28, (u * 7.1) % 6.28, (u * 13.7) % 6.28] as [number, number, number],
  };
}

const gemMats = new Map<string, Material>();
/** Cut gems: faceted, iridescent, a little of their own light. */
export function gemMaterial(color: string) {
  let m = gemMats.get(color);
  if (!m) {
    m = new MeshPhysicalMaterial({
      color,
      roughness: 0.02,
      metalness: 0.1,
      clearcoat: 1,
      iridescence: 1,
      iridescenceIOR: 1.7,
      envMapIntensity: 3.2,
      emissive: color,
      emissiveIntensity: 0.14,
      flatShading: true,
    });
    gemMats.set(color, m);
  }
  return m;
}
