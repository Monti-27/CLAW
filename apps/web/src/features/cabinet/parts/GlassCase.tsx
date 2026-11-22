"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, DoubleSide, type PointLight, ShaderMaterial } from "three";
import { useGameStore } from "@/stores/game.store";
import { CABINET, CASE, CASE_TOP, LEDGE } from "../config/dimensions";
import { getMaterials } from "../materials";

const W = CABINET.width;
const D = CABINET.depth;
const F = CASE.frame;
const H = CASE.height;
const MID_Y = CASE.bottom + H / 2;

/** Dark rail with a chrome lip under the glass. */
export function Ledge() {
  const m = getMaterials();
  return (
    <group>
      <mesh material={m.darkGlass} position={[0, LEDGE.bottom + LEDGE.height / 2, 0]}>
        <boxGeometry args={[W + 0.012, LEDGE.height, D + 0.012]} />
      </mesh>
      <mesh material={m.chrome} position={[0, LEDGE.bottom + LEDGE.height - 0.006, D / 2 + 0.008]}>
        <boxGeometry args={[W + 0.016, 0.012, 0.012]} />
      </mesh>
      <mesh material={m.chrome} position={[0, LEDGE.bottom + 0.004, D / 2 + 0.008]}>
        <boxGeometry args={[W + 0.016, 0.006, 0.01]} />
      </mesh>
    </group>
  );
}

const CALM = new Color("#fff3ec");
const WARM = new Color("#ffd9b0");
const PINK = new Color("#ff5a9c");

/**
 * The two lamps under the case ceiling. Calm white normally; during a win
 * they pulse warm and pink (the same two lights, so a win adds no shader cost).
 */
function CaseLights() {
  const lights = useRef<(PointLight | null)[]>([]);
  const level = useRef(0);
  const tint = useMemo(() => new Color(), []);

  useFrame((state, delta) => {
    const phase = useGameStore.getState().phase;
    const goal = phase === "celebrate" ? 1 : phase === "prize" ? 0.18 : 0;
    level.current += (goal - level.current) * Math.min(1, delta * 3);
    const t = state.clock.elapsedTime;
    lights.current.forEach((l, i) => {
      if (!l) return;
      const beat = Math.sin(t * 5 + i * Math.PI) * 0.5 + 0.5;
      l.intensity = 0.4 + level.current * (1.2 + beat * 1.6);
      tint.copy(WARM).lerp(PINK, beat);
      l.color.copy(CALM).lerp(tint, level.current);
    });
  });

  return (
    <>
      {[-0.4, 0.4].map((x, i) => (
        <pointLight
          key={x}
          ref={(l) => {
            lights.current[i] = l;
          }}
          position={[x, CASE_TOP - 0.07, 0.1]}
          intensity={0.4}
          distance={1.6}
          color="#fff3ec"
        />
      ))}
    </>
  );
}

/**
 * Light on the glass itself: a soft diagonal glare that slides as the camera
 * moves (it's computed from the view direction), and a thin bright line along
 * each edge where you'd see the pane's thickness. Additive and depth-free, so
 * it never hides what's inside; one shader, five quads.
 */
function glareMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vView;
      varying vec3 vN;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vView = normalize(cameraPosition - w.xyz);
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vView;
      varying vec3 vN;
      float band(float x, float c, float w) { float d = (x - c) / w; return exp(-d * d); }
      void main() {
        // where the glare sits depends on where you stand
        float shift = dot(vView, cross(vN, vec3(0.0, 1.0, 0.0))) * 0.9;
        float x = vUv.x + vUv.y * 0.42 + shift;
        float glare = band(x, 0.55, 0.07) * 0.5 + band(x, 0.72, 0.018) * 0.7 + band(x, 0.31, 0.03) * 0.22;
        glare *= smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
        // pane edges catch the light
        vec2 e = min(vUv, 1.0 - vUv);
        float edge = exp(-min(e.x, e.y) * 220.0) * 0.65;
        // brighter at grazing angles, like real glass
        float fres = pow(1.0 - abs(dot(vView, vN)), 3.0);
        float a = glare * (0.05 + fres * 0.35) + edge * (0.18 + fres * 0.5);
        vec3 col = vec3(1.0, 0.97, 0.95) * a;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/** Glass box: chrome frame, glass panes, white interior, center divider. */
export function GlassCase() {
  const m = getMaterials();
  const glare = useMemo(glareMaterial, []);

  const posts: [number, number][] = [
    [-W / 2 + F / 2, D / 2 - F / 2],
    [W / 2 - F / 2, D / 2 - F / 2],
    [-W / 2 + F / 2, -D / 2 + F / 2],
    [W / 2 - F / 2, -D / 2 + F / 2],
    [0, D / 2 - F / 2],
  ];

  return (
    <group>
      {/* floor */}
      <mesh material={m.interior} position={[0, CASE.bottom + 0.006, 0]}>
        <boxGeometry args={[W - 0.01, 0.012, D - 0.01]} />
      </mesh>

      {/* back wall: mirrored like real cabinets, doubles the pile */}
      <mesh material={m.mirror} position={[0, MID_Y, -D / 2 + 0.006]}>
        <boxGeometry args={[W - 0.02, H, 0.008]} />
      </mesh>

      <CaseLights />

      {/* ceiling light panel */}
      <mesh position={[0, CASE_TOP - 0.008, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.06, D - 0.06]} />
        <meshStandardMaterial color="#ffffff" emissive="#fff4f8" emissiveIntensity={0.42} />
      </mesh>

      {/* glass panes */}
      <mesh material={m.glass} position={[-W / 4, MID_Y, D / 2 - 0.004]}>
        <planeGeometry args={[W / 2 - F, H - F]} />
      </mesh>
      <mesh material={m.glass} position={[W / 4, MID_Y, D / 2 - 0.004]}>
        <planeGeometry args={[W / 2 - F, H - F]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          material={m.glass}
          position={[s * (W / 2 - 0.004), MID_Y, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[D - F, H - F]} />
        </mesh>
      ))}

      {/* light on the glass */}
      {[-1, 1].map((s) => (
        <mesh key={`fg${s}`} material={glare} position={[(s * W) / 4, MID_Y, D / 2 - 0.002]} renderOrder={4}>
          <planeGeometry args={[W / 2 - F, H - F]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={`sg${s}`}
          material={glare}
          position={[s * (W / 2 - 0.002), MID_Y, 0]}
          rotation={[0, s * (Math.PI / 2), 0]}
          renderOrder={4}
        >
          <planeGeometry args={[D - F, H - F]} />
        </mesh>
      ))}

      {/* center divider */}
      <mesh
        material={m.acrylic}
        position={[0, CASE.bottom + 0.2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[D - 0.06, 0.38]} />
      </mesh>

      {/* vertical posts */}
      {posts.map(([x, z]) => (
        <mesh key={`${x}-${z}`} material={m.aluminum} position={[x, MID_Y, z]}>
          <boxGeometry args={[F, H, F]} />
        </mesh>
      ))}

      {/* top + bottom rails, front and sides */}
      {[CASE.bottom + F / 2, CASE_TOP - F / 2].map((y) => (
        <group key={y}>
          <mesh material={m.aluminum} position={[0, y, D / 2 - F / 2]}>
            <boxGeometry args={[W, F, F]} />
          </mesh>
          <mesh material={m.aluminum} position={[0, y, -D / 2 + F / 2]}>
            <boxGeometry args={[W, F, F]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={m.aluminum} position={[s * (W / 2 - F / 2), y, 0]}>
              <boxGeometry args={[F, F, D]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* glass clip brackets on the front corners */}
      {[-1, 1].map((s) =>
        [CASE.bottom + 0.06, CASE_TOP - 0.06].map((y) => (
          <mesh
            key={`${s}-${y}`}
            material={m.plinth}
            position={[s * (W / 2 - 0.002), y, D / 2 - 0.002]}
          >
            <boxGeometry args={[0.014, 0.05, 0.014]} />
          </mesh>
        )),
      )}
    </group>
  );
}
