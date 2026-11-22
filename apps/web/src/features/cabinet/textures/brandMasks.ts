/**
 * Brand artwork as alpha masks for the canvas-painted cabinet prints: the
 * Solana glyph (its official path), the claw mark (same geometry as the UI
 * logo) and the MagicBlock mark (stencilled from its light-on-dark PNG).
 * Masks are white-on-transparent canvases, trimmed to their artwork.
 */

export type Mask = HTMLCanvasElement;

const SOLANA_PATH =
  "M100.48 69.3817L83.8068 86.8015C83.4444 87.1799 83.0058 87.4816 82.5185 87.6878C82.0312 87.894 81.5055 88.0003 80.9743 88H1.93563C1.55849 88 1.18957 87.8926 0.874202 87.6912C0.558829 87.4897 0.31074 87.2029 0.160416 86.8659C0.0100923 86.529 -0.0359181 86.1566 0.0280382 85.7945C0.0919944 85.4324 0.263131 85.0964 0.520422 84.8278L17.2061 67.408C17.5676 67.0306 18.0047 66.7295 18.4904 66.5234C18.9762 66.3172 19.5002 66.2104 20.0301 66.2095H99.0644C99.4415 66.2095 99.8104 66.3169 100.126 66.5183C100.441 66.7198 100.689 67.0067 100.84 67.3436C100.99 67.6806 101.036 68.0529 100.972 68.415C100.908 68.7771 100.737 69.1131 100.48 69.3817ZM83.8068 34.3032C83.4444 33.9248 83.0058 33.6231 82.5185 33.4169C82.0312 33.2108 81.5055 33.1045 80.9743 33.1048H1.93563C1.55849 33.1048 1.18957 33.2121 0.874202 33.4136C0.558829 33.6151 0.31074 33.9019 0.160416 34.2388C0.0100923 34.5758 -0.0359181 34.9482 0.0280382 35.3103C0.0919944 35.6723 0.263131 36.0083 0.520422 36.277L17.2061 53.6968C17.5676 54.0742 18.0047 54.3752 18.4904 54.5814C18.9762 54.7875 19.5002 54.8944 20.0301 54.8952H99.0644C99.4415 54.8952 99.8104 54.7879 100.126 54.5864C100.441 54.3849 100.689 54.0981 100.84 53.7612C100.99 53.4242 101.036 53.0518 100.972 52.6897C100.908 52.3277 100.737 51.9917 100.48 51.723L83.8068 34.3032ZM1.93563 21.7905H80.9743C81.5055 21.7907 82.0312 21.6845 82.5185 21.4783C83.0058 21.2721 83.4444 20.9704 83.8068 20.592L100.48 3.17219C100.737 2.90357 100.908 2.56758 100.972 2.2055C101.036 1.84342 100.99 1.47103 100.84 1.13408C100.689 0.79713 100.441 0.510296 100.126 0.308823C99.8104 0.107349 99.4415 1.24074e-05 99.0644 0L20.0301 0C19.5002 0.000878397 18.9762 0.107699 18.4904 0.313848C18.0047 0.519998 17.5676 0.821087 17.2061 1.19848L0.524723 18.6183C0.267681 18.8866 0.0966198 19.2223 0.0325185 19.5839C-0.0315829 19.9456 0.0140624 20.3177 0.163856 20.6545C0.31365 20.9913 0.561081 21.2781 0.875804 21.4799C1.19053 21.6817 1.55886 21.7896 1.93563 21.7905Z";

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

/** Solana glyph at `height` px tall. */
export function solanaMask(height: number): Mask {
  const s = height / 88;
  const c = canvas(101 * s, height);
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.scale(s, s);
  ctx.fillStyle = "#fff";
  ctx.fill(new Path2D(SOLANA_PATH));
  return c;
}

// the claw mark, as in features/play/ui/brand/Logo.tsx (viewBox 4.3 1.6 23.4 24)
const MARK = {
  box: [4.3, 1.6, 23.4, 24] as const,
  center: { x: 16, y: 14.5 },
  R: 10.6,
  dots: [
    [-128, 2.7],
    [-86, 2.3],
    [-43, 1.95],
    [0, 1.7],
    [43, 1.95],
    [86, 2.3],
    [128, 2.7],
  ] as const,
  prize: { x: 16, y: 21.2, r: 3.9 },
};

/** Claw mark plus the "claw" wordmark, the UI lockup, `height` px tall (cap/ascender height). */
export function clawLockupMask(height: number, font: string): Mask {
  const markH = height * 1.05;
  const s = markH / MARK.box[3];
  const markW = MARK.box[2] * s;
  const size = height / 0.74; // the mark matches the height of the "l"
  const probe = canvas(4, 4).getContext("2d") as CanvasRenderingContext2D;
  probe.font = `600 ${size}px ${font}`;
  probe.letterSpacing = `${(-0.06 * size).toFixed(1)}px`;
  const textW = probe.measureText("claw").width;
  const gap = size * 0.2;
  const pad = Math.ceil(size * 0.12);
  const c = canvas(markW + gap + textW + pad * 2, size * 1.1 + pad * 2);
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.fillStyle = "#fff";
  const baseline = pad + size * 0.92;
  // mark: bottom on the baseline
  ctx.save();
  ctx.translate(pad, baseline - markH);
  ctx.scale(s, s);
  ctx.translate(-MARK.box[0], -MARK.box[1]);
  for (const [a, r] of MARK.dots) {
    const t = (a * Math.PI) / 180;
    ctx.beginPath();
    ctx.arc(MARK.center.x + Math.sin(t) * MARK.R, MARK.center.y - Math.cos(t) * MARK.R, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(MARK.prize.x, MARK.prize.y, MARK.prize.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.font = `600 ${size}px ${font}`;
  ctx.letterSpacing = `${(-0.06 * size).toFixed(1)}px`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("claw", pad + markW + gap, baseline);
  return trim(c);
}

/** A line of text as a mask, `size` px font, letter spacing in em. */
export function textMask(text: string, size: number, font: string, weight = 600, spacing = 0.18): Mask {
  const probe = canvas(4, 4).getContext("2d") as CanvasRenderingContext2D;
  const f = `${weight} ${size}px ${font}`;
  probe.font = f;
  probe.letterSpacing = `${(spacing * size).toFixed(1)}px`;
  const w = probe.measureText(text).width;
  const c = canvas(w + size, size * 1.6);
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.font = f;
  ctx.letterSpacing = `${(spacing * size).toFixed(1)}px`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size * 0.5, c.height / 2);
  return trim(c);
}

/** Crops a mask to its painted pixels. */
function trim(c: Mask): Mask {
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if ((data[(y * width + x) * 4 + 3] ?? 0) > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return c;
  const out = canvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext("2d")?.drawImage(c, -x0, -y0);
  return out;
}

let magic: Mask | null = null;
let loading: Promise<void> | null = null;

/** The MagicBlock mark, once its PNG has loaded (null before that). */
export const magicBlockMask = () => magic;

/** Loads the raster marks; resolves when they are ready to paint. */
export function loadBrandMasks(): Promise<void> {
  loading ??= new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = canvas(img.naturalWidth, img.naturalHeight);
      const ctx = c.getContext("2d") as CanvasRenderingContext2D;
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, c.width, c.height);
      const d = px.data;
      // light-on-dark artwork: brightness becomes coverage
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.299 * (d[i] ?? 0) + 0.587 * (d[i + 1] ?? 0) + 0.114 * (d[i + 2] ?? 0);
        const a = Math.min(1, Math.max(0, (l - 60) / 150));
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = Math.round(a * 255);
      }
      ctx.putImageData(px, 0, 0);
      magic = trim(c);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = "/brand/magicblock.png";
  });
  return loading;
}

/**
 * Paints a mask as an engraving cut into the surface: a paint-filled floor,
 * a soft shadow under the top lip, and a fine highlight on the lower edge
 * where the cut catches the light.
 */
export function engrave(
  ctx: CanvasRenderingContext2D,
  mask: Mask,
  cx: number,
  cy: number,
  height: number,
  fill: string | CanvasGradient | ((c: CanvasRenderingContext2D, w: number, h: number) => void),
) {
  const s = height / mask.height;
  const w = Math.round(mask.width * s);
  const h = Math.round(height);
  const pad = Math.ceil(h * 0.2) + 4;
  const layer = canvas(w + pad * 2, h + pad * 2);
  const l = layer.getContext("2d") as CanvasRenderingContext2D;
  l.imageSmoothingQuality = "high";
  l.drawImage(mask, pad, pad, w, h);

  // the paint in the cut
  l.globalCompositeOperation = "source-in";
  if (typeof fill === "function") {
    l.save();
    l.translate(pad, pad);
    fill(l, w, h);
    l.restore();
  } else {
    l.fillStyle = fill;
    l.fillRect(0, 0, layer.width, layer.height);
  }

  // everything outside the cut, used to cast shadow and highlight inward
  const outside = canvas(layer.width, layer.height);
  const o = outside.getContext("2d") as CanvasRenderingContext2D;
  o.fillStyle = "#000";
  o.fillRect(0, 0, outside.width, outside.height);
  o.globalCompositeOperation = "destination-out";
  o.drawImage(mask, pad, pad, w, h);

  const depth = Math.max(1.2, h * 0.035);
  l.globalCompositeOperation = "source-atop";
  l.shadowColor = "rgba(0,0,0,0.85)";
  l.shadowBlur = depth * 1.6;
  l.shadowOffsetX = 0;
  l.shadowOffsetY = depth;
  l.drawImage(outside, 0, 0);
  l.shadowColor = "rgba(255,255,255,0.35)";
  l.shadowBlur = depth * 0.6;
  l.shadowOffsetY = -depth * 0.7;
  l.drawImage(outside, 0, 0);

  ctx.drawImage(layer, Math.round(cx - w / 2 - pad), Math.round(cy - h / 2 - pad));
}

/** The same cut, as depth for a bump map: black where the surface is cut away. */
export function engraveDepth(ctx: CanvasRenderingContext2D, mask: Mask, cx: number, cy: number, height: number) {
  const s = height / mask.height;
  const w = mask.width * s;
  const layer = canvas(w + 8, height + 8);
  const l = layer.getContext("2d") as CanvasRenderingContext2D;
  l.drawImage(mask, 4, 4, w, height);
  l.globalCompositeOperation = "source-in";
  l.fillStyle = "#000";
  l.fillRect(0, 0, layer.width, layer.height);
  ctx.save();
  ctx.filter = `blur(${Math.max(0.6, height * 0.012)}px)`;
  ctx.drawImage(layer, cx - w / 2 - 4, cy - height / 2 - 4);
  ctx.restore();
}
