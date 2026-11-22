import { CanvasTexture, SRGBColorSpace } from "three";

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** Paints a 2D canvas once and wraps it as an sRGB texture. */
export function paintTexture(width: number, height: number, draw: Draw): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  draw(ctx, width, height);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 16; // clamped to what the GPU supports
  return texture;
}

/** Repaint an existing canvas texture (used after web fonts finish loading). */
export function repaint(texture: CanvasTexture, draw: Draw) {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(ctx, canvas.width, canvas.height);
  texture.needsUpdate = true;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export const DISPLAY_FONT = `"Bricolage Grotesque Variable", "Arial Black", system-ui, sans-serif`;
export const BODY_FONT = DISPLAY_FONT;
export const MONO_FONT = `"Geist Mono Variable", ui-monospace, Menlo, monospace`;
