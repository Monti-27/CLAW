"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { CABINET, CASE, CASE_TOP, LEDGE, MARQUEE, PLINTH } from "../config/dimensions";
import { getMaterials } from "../materials";
import { drawRatingPlate } from "../textures/art";
import { useArtTexture } from "../textures/useArtTexture";
import { BrandInlay } from "./BrandInlay";
import { Fan } from "./Fan";

const W = CABINET.width;
const SHEET = 0.012;
const LOWER = { bottom: PLINTH.height, top: LEDGE.bottom - 0.01 };
const UPPER = { bottom: CASE.bottom, top: CASE_TOP + 0.02 };
const LOOM_X = 0.705;
const LOUVRE_SLATS = Array.from({ length: 9 }, (_, i) => -0.064 + i * 0.016);
const COOLING_SLOTS = Array.from({ length: 7 }, (_, i) => -0.25 + i * 0.045);

type P3 = [number, number, number];
const tube = (pts: P3[], radius: number, segments = 80) =>
  new TubeGeometry(new CatmullRomCurve3(pts.map((p) => new Vector3(...p))), segments, radius, 8);

/**
 * The service side. Local +Z points out of the back and +X is to the right
 * of someone standing behind the machine.
 */
export function BackPanel() {
  const m = getMaterials();
  return (
    <group position={[0, 0, -CABINET.depth / 2]} rotation={[0, Math.PI, 0]}>
      {/* painted sheet steel, lower body and case back */}
      <mesh
        material={m.sheet}
        position={[0, (LOWER.top + LOWER.bottom) / 2, SHEET / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W, LOWER.top - LOWER.bottom, SHEET]} />
      </mesh>
      <mesh
        material={m.sheet}
        position={[0, (UPPER.top + UPPER.bottom) / 2, SHEET / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W, UPPER.top - UPPER.bottom, SHEET]} />
      </mesh>

      <group position={[0, 0, SHEET]}>
        <ServiceDoor />
        <PowerModule />
        <RatingPlate />
        <WireLoom />
        <CaseBack />
        <MarqueeBack />
      </group>
    </group>
  );
}

/** Hinged access door with a louvre, a fan and a quarter-turn lock. */
function ServiceDoor() {
  const m = getMaterials();
  const door = { x: -0.17, y: 0.58, w: 0.9, h: 0.86 };

  return (
    <group position={[door.x, door.y, 0]}>
      {/* shadow gap, then the door skin standing 6mm proud */}
      <mesh material={m.plinth} position={[0, 0, 0.001]}>
        <planeGeometry args={[door.w + 0.014, door.h + 0.014]} />
      </mesh>
      <RoundedBox
        args={[door.w, door.h, 0.012]}
        radius={0.005}
        material={m.sheet}
        position={[0, 0, 0.006]}
        castShadow
      />
      {/* pressed stiffening ribs */}
      {[-0.13, -0.3].map((y) => (
        <RoundedBox
          key={y}
          args={[door.w - 0.12, 0.022, 0.006]}
          radius={0.003}
          material={m.sheet}
          position={[0, y, 0.013]}
        />
      ))}

      {/* hinges down the left edge */}
      {[-0.3, 0, 0.3].map((y) => (
        <group key={y} position={[-door.w / 2 - 0.004, y, 0.012]}>
          <mesh material={m.brushed}>
            <cylinderGeometry args={[0.007, 0.007, 0.07, 14]} />
          </mesh>
          <mesh material={m.brushed} position={[0.018, 0, -0.003]}>
            <boxGeometry args={[0.03, 0.06, 0.003]} />
          </mesh>
        </group>
      ))}

      {/* lock and pull on the right */}
      <group position={[door.w / 2 - 0.05, 0.02, 0.012]}>
        <mesh material={m.chrome} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.013, 0.015, 0.008, 28]} />
        </mesh>
        <mesh material={m.plinth} position={[0, 0, 0.0045]}>
          <boxGeometry args={[0.003, 0.012, 0.001]} />
        </mesh>
        <mesh material={m.blackGloss} position={[0, -0.09, -0.003]}>
          <boxGeometry args={[0.03, 0.09, 0.004]} />
        </mesh>
        <mesh material={m.chrome} position={[0, -0.09, 0.006]}>
          <boxGeometry args={[0.008, 0.07, 0.01]} />
        </mesh>
      </group>

      {/* louvre: a dark opening set clear of the door skin, slats standing in front of it */}
      <group position={[0.02, 0.27, 0.012]}>
        <mesh material={m.plinth} position={[0, 0, 0.0015]}>
          <planeGeometry args={[0.56, 0.15]} />
        </mesh>
        {LOUVRE_SLATS.map((y) => (
          <mesh key={y} material={m.sheet} position={[0, y, 0.0085]} rotation={[0.75, 0, 0]}>
            <boxGeometry args={[0.56, 0.013, 0.002]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh material={m.sheet} position={[s * 0.287, 0, 0.007]}>
              <boxGeometry args={[0.014, 0.178, 0.014]} />
            </mesh>
            <mesh material={m.sheet} position={[0, s * 0.082, 0.007]}>
              <boxGeometry args={[0.588, 0.014, 0.014]} />
            </mesh>
          </group>
        ))}
      </group>

      <group position={[-0.24, -0.02, 0.0135]}>
        <Fan />
      </group>
    </group>
  );
}

/** Mains inlet with rocker switch and fuse, and the cable trailing to a wall plug. */
function PowerModule() {
  const m = getMaterials();
  const cable = useMemo(
    () =>
      tube(
        [
          [0.55, 0.245, 0.02],
          [0.55, 0.235, 0.075],
          [0.555, 0.12, 0.115],
          [0.585, 0.014, 0.19],
          [0.68, 0.012, 0.33],
          [0.62, 0.012, 0.48],
          [0.46, 0.012, 0.58],
          [0.4, 0.02, 0.62],
        ],
        0.0065,
        140,
      ),
    [],
  );
  return (
    <group>
      <group position={[0.55, 0.29, 0]}>
        <RoundedBox
          args={[0.13, 0.19, 0.016]}
          radius={0.004}
          material={m.blackGloss}
          position={[0, 0, 0.008]}
          castShadow
        />
        {/* rocker switch, lit */}
        <mesh position={[0, 0.055, 0.019]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[0.03, 0.04, 0.008]} />
          <meshStandardMaterial
            color="#ff2b4e"
            emissive="#ff2b4e"
            emissiveIntensity={1.6}
            roughness={0.3}
            toneMapped={false}
          />
        </mesh>
        {/* fuse cap */}
        <mesh material={m.rubber} position={[0.038, 0.055, 0.018]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.009, 0.009, 0.006, 16]} />
        </mesh>
        {/* connector body where the lead plugs in */}
        <RoundedBox
          args={[0.05, 0.036, 0.03]}
          radius={0.004}
          material={m.rubber}
          position={[0, -0.045, 0.024]}
        />
      </group>
      <mesh geometry={cable} material={m.rubber} castShadow />
      {/* floor box the lead plugs into */}
      <RoundedBox
        args={[0.12, 0.022, 0.12]}
        radius={0.005}
        material={m.brushed}
        position={[0.37, 0.011, 0.64]}
      />
      <RoundedBox
        args={[0.05, 0.03, 0.04]}
        radius={0.006}
        material={m.rubber}
        position={[0.39, 0.03, 0.63]}
      />
    </group>
  );
}

function RatingPlate() {
  const m = getMaterials();
  const art = useArtTexture(640, 400, drawRatingPlate);
  const size: [number, number] = [0.22, 0.1375];
  return (
    <group position={[0.53, 0.6, 0.001]}>
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial map={art} metalness={0.75} roughness={0.38} envMapIntensity={1.3} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => (
          <mesh
            key={`${sx}${sy}`}
            material={m.chrome}
            position={[sx * (size[0] / 2 - 0.008), sy * (size[1] / 2 - 0.008), 0.001]}
          >
            <sphereGeometry args={[0.0035, 10, 8]} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Three leads running from the power module up to the marquee, held by saddle clips. */
function WireLoom() {
  const m = getMaterials();
  const top = MARQUEE.bottom + 0.1;
  const wires = useMemo(
    () =>
      [-0.009, 0, 0.009].map((dx, i) =>
        tube(
          [
            [0.575 + dx * 0.5, 0.385, 0.012],
            [0.62 + dx, 0.47 + i * 0.01, 0.02],
            [LOOM_X + dx, 0.62, 0.012],
            [LOOM_X + dx, 1.3, 0.012 + (i === 1 ? 0.004 : 0)],
            [LOOM_X + dx, top - 0.14, 0.012],
            [LOOM_X - 0.03 + dx, top - 0.04, 0.02],
            [LOOM_X - 0.07 + dx * 0.5, top, 0.03],
          ],
          0.0038,
          120,
        ),
      ),
    [top],
  );
  const colors = ["#f4eee8", "#141216", "#e8478f"];
  const clips = [0.66, 0.95, 1.26, 1.56, 1.86];
  return (
    <group>
      {wires.map((g, i) => (
        <mesh key={colors[i]} geometry={g} castShadow>
          <meshStandardMaterial color={colors[i]} roughness={0.55} />
        </mesh>
      ))}
      {clips.map((y) => (
        <group key={y} position={[LOOM_X, y, 0]}>
          <RoundedBox
            args={[0.046, 0.014, 0.022]}
            radius={0.004}
            material={m.brushed}
            position={[0, 0, 0.011]}
          />
          <mesh material={m.chrome} position={[0.018, 0, 0.022]}>
            <sphereGeometry args={[0.003, 8, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Back of the prize case: ribbed sheet, rivets and the partner plaque. */
function CaseBack() {
  const m = getMaterials();
  const midY = (UPPER.top + UPPER.bottom) / 2;
  const rivets = useMemo(() => {
    const out: [number, number][] = [];
    const xs = 9;
    for (let i = 0; i <= xs; i++) {
      const x = -W / 2 + 0.03 + (i * (W - 0.06)) / xs;
      out.push([x, UPPER.bottom + 0.025], [x, UPPER.top - 0.025]);
    }
    for (const y of [midY - 0.17, midY, midY + 0.17])
      out.push([-W / 2 + 0.03, y], [W / 2 - 0.03, y]);
    return out;
  }, [midY]);

  return (
    <group>
      {[midY + 0.325, midY - 0.325].map((y) => (
        <RoundedBox
          key={y}
          args={[W - 0.3, 0.026, 0.006]}
          radius={0.003}
          material={m.sheet}
          position={[-0.06, y, 0.002]}
        />
      ))}
      {rivets.map(([x, y]) => (
        <mesh key={`${x}-${y}`} material={m.brushed} position={[x, y, 0.001]}>
          <sphereGeometry args={[0.005, 10, 8]} />
        </mesh>
      ))}
      <Plaque position={[-0.06, midY, 0]} />
    </group>
  );
}

/**
 * The partner plaque: a wide brushed plate with two deep wells and its own
 * picture light, so it reads from across the room. Each well is filled from
 * /public/brand (see BrandInlay).
 */
function Plaque({ position }: { position: [number, number, number] }) {
  const m = getMaterials();
  const plate = { w: 1.08, h: 0.4 };
  const well = { w: 0.4, h: 0.29 };
  return (
    <group position={position}>
      <RoundedBox
        args={[plate.w, plate.h, 0.014]}
        radius={0.005}
        material={m.aluminum}
        position={[0, 0, 0.007]}
        castShadow
      />
      {[
        { x: -0.3, name: "solana" },
        { x: 0.3, name: "magicblock" },
      ].map((slot) => (
        <group key={slot.name} position={[slot.x, 0, 0.0142]}>
          <RoundedBox args={[well.w, well.h, 0.002]} radius={0.001} material={m.rubber} />
          <group position={[0, 0, 0.001]}>
            <BrandInlay name={slot.name} width={well.w - 0.08} height={well.h - 0.06} />
          </group>
        </group>
      ))}
      {/* the "x" between the two marks, inlaid in the same gold */}
      {[Math.PI / 4, -Math.PI / 4].map((a) => (
        <mesh key={a} material={m.inlay} position={[0, 0, 0.0155]} rotation={[0, 0, a]}>
          <boxGeometry args={[0.07, 0.009, 0.003]} />
        </mesh>
      ))}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => (
          <mesh
            key={`${sx}${sy}`}
            material={m.chrome}
            position={[sx * (plate.w / 2 - 0.022), sy * (plate.h / 2 - 0.022), 0.015]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.007, 0.007, 0.004, 6]} />
          </mesh>
        )),
      )}

      {/* picture light: a slim bar on two stems, washing the plate from above */}
      <group position={[0, plate.h / 2 + 0.05, 0]}>
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} material={m.brushed} position={[x, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.08, 10]} />
          </mesh>
        ))}
        <RoundedBox
          args={[0.8, 0.022, 0.03]}
          radius={0.008}
          material={m.brushed}
          position={[0, 0, 0.085]}
        />
        <mesh position={[0, -0.012, 0.085]}>
          <boxGeometry args={[0.76, 0.003, 0.016]} />
          <meshBasicMaterial color={[3, 2.5, 2]} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Back of the light box: cooling slots and the junction box the loom runs into. */
function MarqueeBack() {
  const m = getMaterials();
  const y = MARQUEE.bottom + MARQUEE.height / 2;
  return (
    <group position={[0, y, 0]}>
      {COOLING_SLOTS.map((x) => (
        <mesh key={x} material={m.plinth} position={[x, 0, 0.001]}>
          <planeGeometry args={[0.014, MARQUEE.height * 0.5]} />
        </mesh>
      ))}
      <group position={[LOOM_X - 0.09, -0.02, 0]}>
        <RoundedBox
          args={[0.15, 0.11, 0.035]}
          radius={0.005}
          material={m.brushed}
          position={[0, 0, 0.0175]}
          castShadow
        />
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sy) => (
            <mesh key={`${sx}${sy}`} material={m.chrome} position={[sx * 0.06, sy * 0.04, 0.036]}>
              <sphereGeometry args={[0.003, 8, 6]} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}
