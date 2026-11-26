import { DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import { PALETTE } from "./config/palette";

/**
 * Shared cabinet materials. Created once and reused by every part so the
 * scene stays at a handful of programs and draw state switches.
 */
function createMaterials() {
  const lacquer = (color: string) =>
    new MeshPhysicalMaterial({
      color,
      roughness: 0.32,
      metalness: 0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
    });

  return {
    hotPink: lacquer(PALETTE.hotPink),
    hotPinkDeep: lacquer(PALETTE.hotPinkDeep),
    blush: lacquer(PALETTE.blush),
    blushLight: lacquer(PALETTE.blushLight),
    chrome: new MeshStandardMaterial({
      color: PALETTE.chrome,
      metalness: 1,
      roughness: 0.1,
      envMapIntensity: 1.6,
    }),
    brushed: new MeshStandardMaterial({
      color: "#d4d4dc",
      metalness: 0.85,
      roughness: 0.32,
      envMapIntensity: 1.4,
    }),
    plinth: new MeshStandardMaterial({ color: PALETTE.plinth, roughness: 0.7 }),
    darkGlass: new MeshStandardMaterial({
      color: "#1b1820",
      roughness: 0.15,
      metalness: 0.3,
    }),
    interior: new MeshStandardMaterial({ color: PALETTE.interior, roughness: 0.55 }),
    mirror: new MeshPhysicalMaterial({
      color: "#f8e6ee",
      roughness: 0.35,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    }),
    aluminum: new MeshStandardMaterial({
      color: "#eceef3",
      metalness: 0.7,
      roughness: 0.28,
      envMapIntensity: 1.5,
    }),
    glass: new MeshPhysicalMaterial({
      color: "#f4fbff",
      transparent: true,
      opacity: 0.06,
      roughness: 0.0,
      metalness: 0,
      clearcoat: 1,
      envMapIntensity: 1.6,
      depthWrite: false,
      side: DoubleSide,
    }),
    acrylic: new MeshPhysicalMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.28,
      roughness: 0.08,
      depthWrite: false,
      side: DoubleSide,
    }),
    clawPlastic: new MeshPhysicalMaterial({
      color: PALETTE.clawOrange,
      roughness: 0.25,
      clearcoat: 0.6,
      transmission: 0,
      sheen: 0.3,
    }),
    clawHead: lacquer(PALETTE.clawHead),
    grille: new MeshStandardMaterial({ color: "#3a2d36", roughness: 0.6 }),
    /** polished stamped steel: bright, but soft enough to pick up the room */
    steel: new MeshStandardMaterial({
      color: "#f3f3f7",
      metalness: 0.9,
      roughness: 0.27,
      envMapIntensity: 2.6,
    }),
    gold: new MeshStandardMaterial({
      color: "#f0c050",
      metalness: 1,
      roughness: 0.24,
      envMapIntensity: 1.5,
    }),
    /** gold that carries a little of its own light, so inlays read in a dark room */
    inlay: new MeshStandardMaterial({
      color: "#ffd878",
      metalness: 0.65,
      roughness: 0.3,
      emissive: "#c08a22",
      emissiveIntensity: 0.4,
      envMapIntensity: 1.6,
    }),
    rubber: new MeshStandardMaterial({ color: "#141216", roughness: 0.85 }),
    blackGloss: new MeshPhysicalMaterial({
      color: "#0e0b10",
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    /** painted sheet steel on the back, a touch rougher than the show faces */
    sheet: new MeshPhysicalMaterial({
      color: PALETTE.hotPinkDeep,
      roughness: 0.42,
      metalness: 0.1,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
    }),
    smoked: new MeshPhysicalMaterial({
      color: "#2a1424",
      transparent: true,
      opacity: 0.62,
      roughness: 0.06,
      clearcoat: 1,
      depthWrite: false,
      side: DoubleSide,
    }),
    cavity: new MeshStandardMaterial({ color: "#0d090f", roughness: 0.7, metalness: 0.2 }),
  } as const;
}

export type CabinetMaterials = ReturnType<typeof createMaterials>;

let cache: CabinetMaterials | null = null;

export function getMaterials(): CabinetMaterials {
  cache ??= createMaterials();
  return cache;
}
