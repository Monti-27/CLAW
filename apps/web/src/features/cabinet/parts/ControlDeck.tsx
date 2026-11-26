"use client";

import { RoundedBox } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  type Mesh,
  AdditiveBlending,
  type Group,
  LatheGeometry,
  type MeshBasicMaterial,
  MeshBasicMaterial as MeshBasicMaterialImpl,
  Shape,
  ShapeGeometry,
  type MeshPhysicalMaterial,
  NoColorSpace,
  Vector2,
} from "three";
import { type ButtonId, useControlsStore } from "@/stores/controls.store";
import { useGameStore } from "@/stores/game.store";
import { BODY, CABINET, DECK } from "../config/dimensions";
import { PALETTE } from "../config/palette";
import { getMaterials } from "../materials";
import { StaticBatch } from "../StaticBatch";
import { type DeckLayout, drawDeck, drawGlow } from "../textures/art";
import { loadBrandMasks } from "../textures/brandMasks";
import { paintTexture, repaint } from "../textures/canvas";
import { useArtTexture } from "../textures/useArtTexture";

const FRONT_Z = CABINET.depth / 2 - 0.04;
// sits between the towers, never into them
const PANEL = { width: BODY.width - 0.008, length: 0.18, thickness: 0.016 };
const PRINT_W = PANEL.width - 0.012;

type ButtonSpec = {
  key: string;
  x: number;
  y: number;
  r: number;
  color: string;
  /** player-1 buttons are live; player-2 is decoration */
  id?: ButtonId;
  /** arrow legend direction, radians; none for the grab button */
  glyph?: number;
};

const PRINT_H = PANEL.length - 0.012;

/** Sizes, metres. Caps and bezels are sized from the cap radius (bezel = 1.4 r). */
const PAD = { r: 0.0172, spread: 0.0385 };
const GRAB = { r: 0.033 };
const BEZEL = 1.4;
/** the row the buttons and logos sit on, and the legend row nearer the player */
const ROW = 0.008;
const LEGEND_Y = -0.064;
const LEGEND_H = 0.0072;

/**
 * Seven zones across the deck with equal air between them:
 * Solana | move | grab | claw | move | grab | MagicBlock.
 */
const ZONES = (() => {
  const widths = {
    logo: 0.072,
    pad: 2 * (PAD.spread + PAD.r * BEZEL),
    grab: 2 * 0.051,
    claw: 0.142,
  };
  const order = ["logo", "pad", "grab", "claw", "pad", "grab", "logo"] as const;
  const margin = 0.024;
  const used = order.reduce((n, z) => n + widths[z], 0);
  const gap = (PRINT_W - margin * 2 - used) / (order.length - 1);
  let x = -PRINT_W / 2 + margin;
  const centers: number[] = [];
  const edges: number[] = [];
  order.forEach((z, i) => {
    centers.push(x + widths[z] / 2);
    x += widths[z];
    if (i < order.length - 1) edges.push(x + gap / 2);
    x += gap;
  });
  return { centers, edges };
})();
const C = ZONES.centers as [number, number, number, number, number, number, number];

/** Buttons for one station, in panel-local units (x across, y up the slope). */
function stationButtons(padX: number, grabX: number, live: boolean, tag: string): ButtonSpec[] {
  const s = PAD.spread;
  const r = PAD.r;
  const id = (b: ButtonId) => (live ? b : undefined);
  const blue = PALETTE.buttonBlue;
  const green = PALETTE.buttonGreen;
  return [
    { key: `${tag}-l`, x: padX - s, y: ROW, r, color: blue, id: id("left"), glyph: Math.PI / 2 },
    { key: `${tag}-r`, x: padX + s, y: ROW, r, color: blue, id: id("right"), glyph: -Math.PI / 2 },
    { key: `${tag}-u`, x: padX, y: ROW + s, r, color: green, id: id("up"), glyph: 0 },
    { key: `${tag}-d`, x: padX, y: ROW - s, r, color: green, id: id("down"), glyph: Math.PI },
    { key: `${tag}-g`, x: grabX, y: ROW, r: GRAB.r, color: PALETTE.buttonOrange, id: id("grab") },
  ];
}

const BUTTONS: ButtonSpec[] = [
  ...stationButtons(C[1], C[2], true, "p1"),
  ...stationButtons(C[4], C[5], false, "p2"),
];

const DECK_LAYOUT: DeckLayout = {
  width: PRINT_W,
  height: PRINT_H,
  legendH: LEGEND_H,
  legends: [
    { x: C[0], y: LEGEND_Y, text: "SOLANA" },
    { x: C[1], y: LEGEND_Y, text: "MOVE" },
    { x: C[2], y: LEGEND_Y, text: "GRAB" },
    { x: C[4], y: LEGEND_Y, text: "MOVE" },
    { x: C[5], y: LEGEND_Y, text: "GRAB" },
    { x: C[6], y: LEGEND_Y, text: "MAGICBLOCK" },
  ],
  rings: [C[2], C[5]].map((x) => ({ x, y: ROW, r: GRAB.r * BEZEL + 0.0035 })),
  // short cuts setting the brand zones apart from the controls
  dividers: [ZONES.edges[0], ZONES.edges[5]].map((x) => ({
    x: x ?? 0,
    y0: ROW - 0.045,
    y1: ROW + 0.045,
  })),
  solana: { x: C[0], y: ROW, h: 0.034 },
  magic: { x: C[6], y: ROW, h: 0.042 },
  claw: { x: C[3], y: ROW, h: 0.033 },
};
const DECK_COLOR = drawDeck(DECK_LAYOUT, "color");
const DECK_BUMP = drawDeck(DECK_LAYOUT, "bump");
const ART_W = 4096;
const ART_H = Math.round((ART_W * PRINT_H) / PRINT_W);

/** Slanted two-player button deck with speaker band above it. */
export function ControlDeck() {
  const m = getMaterials();
  const art = useArtTexture(ART_W, ART_H, DECK_COLOR);
  const depth_ = useArtTexture(ART_W, ART_H, DECK_BUMP);
  depth_.colorSpace = NoColorSpace;
  // the MagicBlock mark is stencilled from a PNG: paint it in once it has loaded
  useEffect(() => {
    let alive = true;
    loadBrandMasks().then(() => {
      if (!alive) return;
      repaint(art, DECK_COLOR);
      repaint(depth_, DECK_BUMP);
    });
    return () => {
      alive = false;
    };
  }, [art, depth_]);
  const depth = BODY.depth;

  return (
    <StaticBatch>
      <RoundedBox
        args={[BODY.width, DECK.height, depth]}
        radius={0.008}
        material={m.blush}
        position={[0, DECK.bottom + DECK.height / 2, FRONT_Z - depth / 2]}
      />
      <SpeakerBand />

      {/* slanted button panel */}
      <group
        position={[0, DECK.bottom + 0.04, FRONT_Z + 0.05]}
        rotation={[-(Math.PI / 2 - DECK.tilt), 0, 0]}
      >
        <RoundedBox
          args={[PANEL.width, PANEL.length, PANEL.thickness]}
          radius={0.006}
          material={m.aluminum}
          castShadow
        />
        <mesh position={[0, 0, PANEL.thickness / 2 + 0.0008]}>
          <planeGeometry args={[PRINT_W, PRINT_H]} />
          <meshPhysicalMaterial
            map={art}
            bumpMap={depth_}
            bumpScale={1.2}
            roughness={0.22}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
        {BUTTONS.map(({ key, ...b }) => (
          <ArcadeButton key={key} {...b} z={PANEL.thickness / 2} />
        ))}
      </group>

      {/* wedge underneath the slanted panel */}
      <mesh material={m.blush} position={[0, DECK.bottom + 0.018, FRONT_Z + 0.024]}>
        <boxGeometry args={[PANEL.width - 0.004, 0.036, 0.054]} />
      </mesh>
    </StaticBatch>
  );
}

/** Lathe profiles for a real illuminated pushbutton, in units of the cap radius. */
function useButtonGeometry() {
  return useMemo(() => {
    const turn = (pts: number[][]) =>
      new LatheGeometry(pts.map(([x, y]) => new Vector2(x, y)).reverse(), 48);
    return {
      // threaded collar and the chamfered bezel ring that sits on the panel
      bezel: turn([
        [1.02, 0.5],
        [1.12, 0.5],
        [1.34, 0.34],
        [1.4, 0.16],
        [1.4, 0],
        [1.02, 0],
      ]),
      // the plunger: straight skirt, soft shoulder, shallow dome
      cap: turn([
        [0, 0.8],
        [0.45, 0.78],
        [0.78, 0.71],
        [0.93, 0.6],
        [0.97, 0.5],
        [0.97, 0.06],
      ]),
    };
  }, []);
}

let glowTexture: ReturnType<typeof paintTexture> | null = null;

/** A solid arrow: head and short stem, pointing up (+Y), in units of the cap radius. */
let arrow: ShapeGeometry | null = null;
function arrowGeometry() {
  if (arrow) return arrow;
  const s = new Shape();
  s.moveTo(0, 0.5);
  s.lineTo(0.42, 0.04);
  s.lineTo(0.16, 0.04);
  s.lineTo(0.16, -0.42);
  s.lineTo(-0.16, -0.42);
  s.lineTo(-0.16, 0.04);
  s.lineTo(-0.42, 0.04);
  s.closePath();
  arrow = new ShapeGeometry(s);
  return arrow;
}
let legend: MeshBasicMaterialImpl | null = null;
const legendMaterial = () => {
  legend ??= new MeshBasicMaterialImpl({ color: "#1a0f1c", polygonOffset: true, polygonOffsetFactor: -2 });
  return legend;
};

function ArcadeButton({ x, y, r, color, z, id, glyph }: Omit<ButtonSpec, "key"> & { z: number }) {
  const m = getMaterials();
  const geo = useButtonGeometry();
  glowTexture ??= paintTexture(128, 128, drawGlow);
  const cap = useRef<Group>(null);
  const capMat = useRef<MeshPhysicalMaterial>(null);
  const halo = useRef<MeshBasicMaterial>(null);
  const haloMesh = useRef<Mesh>(null);
  const glow = useRef(0.06);
  const press = useControlsStore((s) => s.press);
  const release = useControlsStore((s) => s.release);

  useFrame((state, delta) => {
    const pressed = id ? useControlsStore.getState().pressed[id] : false;
    const live = id !== undefined && useGameStore.getState().phase === "playing";
    const t = state.clock.elapsedTime;
    // lamps stay below the bloom threshold: lit plastic, not a light bulb.
    // the grab button breathes on your turn; a press brightens, it never blows out
    const idle = live ? (id === "grab" ? 0.32 + Math.sin(t * 3.2) * 0.12 : 0.2) : 0.06;
    const goal = pressed ? 0.75 : idle;
    glow.current += (goal - glow.current) * Math.min(1, delta * (pressed ? 24 : 8));
    if (capMat.current) capMat.current.emissiveIntensity = glow.current;
    if (halo.current) halo.current.opacity = Math.min(0.28, Math.max(0, (glow.current - 0.4) * 0.8));
    // an invisible halo still costs a blended draw; skip it while it's dark
    if (haloMesh.current) haloMesh.current.visible = (halo.current?.opacity ?? 0) > 0.004;
    if (cap.current) {
      // a few millimetres of travel: the dome stays proud of the bezel
      const travel = pressed ? -0.11 * r : 0;
      cap.current.position.y += (travel - cap.current.position.y) * Math.min(1, delta * 40);
    }
  });

  const handlers = id
    ? {
        onPointerDown: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
          press(id);
        },
        onPointerUp: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          release(id);
        },
        onPointerOver: () => {
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          document.body.style.cursor = "";
          release(id);
        },
      }
    : {};

  return (
    <group position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
      {/* light spilling onto the panel */}
      <mesh ref={haloMesh} position={[0, 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[r * 6, r * 6]} />
        <meshBasicMaterial
          ref={halo}
          map={glowTexture}
          color={color}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        geometry={geo.bezel}
        material={glyph === undefined ? m.chrome : m.blackGloss}
        scale={r}
        castShadow
      />
      <group ref={cap} userData={{ noMerge: true }}>
        <mesh geometry={geo.cap} scale={r}>
          <meshPhysicalMaterial
            ref={capMat}
            color={color}
            roughness={0.12}
            clearcoat={1}
            clearcoatRoughness={0.04}
            emissive={color}
            emissiveIntensity={0.06}
          />
        </mesh>
        {glyph !== undefined && (
          // printed legend: a dark arrow on the lit cap reads at any distance
          <mesh
            geometry={arrowGeometry()}
            material={legendMaterial()}
            position={[0, r * 0.805, 0]}
            rotation={[-Math.PI / 2, 0, glyph]}
            scale={r}
          />
        )}
      </group>
      {/* generous invisible hit target so the buttons are easy to tap on a phone */}
      {id && (
        <mesh position={[0, r * 0.4, 0]} {...handlers}>
          <cylinderGeometry args={[r * 1.9, r * 1.9, r * 1.6, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function SpeakerBand() {
  const m = getMaterials();
  const y = DECK.bottom + DECK.height - 0.03;
  const z = FRONT_Z + 0.001;
  return (
    <group position={[0, y, z]}>
      {[-0.3, 0.3].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} material={m.grille} position={[0, (i - 1) * 0.011, 0]}>
              <boxGeometry args={[0.07, 0.005, 0.003]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
