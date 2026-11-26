import { PALETTE } from "../config/palette";
import {
  clawLockupMask,
  engrave,
  engraveDepth,
  magicBlockMask,
  type Mask,
  solanaMask,
  textMask,
} from "./brandMasks";
import { DISPLAY_FONT, type Draw, MONO_FONT, roundRect } from "./canvas";

const UI_FONT = "Geist, system-ui, sans-serif";
const display = (px: number, weight = 800) => `${weight} ${Math.round(px)}px ${DISPLAY_FONT}`;
const mono = (px: number, weight = 500) => `${weight} ${Math.round(px)}px ${MONO_FONT}`;

/**
 * Marquee face: a smoked acrylic sign with the claw lockup bent in pink LED
 * neon (white-hot core, pink tube, soft spill), a faint dot-matrix behind it,
 * and the two credits set small either side. Painted once; used as both the
 * colour and the light of the sign, so the neon is what blooms.
 */
export const drawMarquee: Draw = (ctx, w, h) => {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#22101f");
  bg.addColorStop(0.55, "#180b17");
  bg.addColorStop(1, "#2a1023");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // pink wash behind the tubes, like light bouncing off the back of the box
  const wash = ctx.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, w * 0.34);
  wash.addColorStop(0, "rgba(255,60,140,0.34)");
  wash.addColorStop(1, "rgba(255,60,140,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  // dot-matrix perforation
  const step = h / 22;
  ctx.fillStyle = "rgba(255,170,210,0.07)";
  for (let y = step / 2; y < h; y += step)
    for (let x = step / 2; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, step * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

  // inner keyline
  ctx.strokeStyle = "rgba(255,110,170,0.45)";
  ctx.lineWidth = Math.max(2, h * 0.008);
  roundRect(ctx, h * 0.07, h * 0.1, w - h * 0.14, h * 0.8, h * 0.08);
  ctx.stroke();

  // the neon lockup: spill, tube, then the hot core
  const lockH = h * 0.5;
  const mask = clawLockupMask(lockH * 2, UI_FONT);
  const lw = (mask.width / mask.height) * lockH;
  const lx = w / 2 - lw / 2;
  const ly = h / 2 - lockH / 2 + h * 0.01;
  const tint = (color: string) => {
    const c = document.createElement("canvas");
    c.width = mask.width;
    c.height = mask.height;
    const t = c.getContext("2d") as CanvasRenderingContext2D;
    t.drawImage(mask, 0, 0);
    t.globalCompositeOperation = "source-in";
    t.fillStyle = color;
    t.fillRect(0, 0, c.width, c.height);
    return c;
  };
  const pink = tint("#ff3d8f");
  ctx.save();
  ctx.shadowColor = "rgba(255,40,130,0.95)";
  for (const blur of [h * 0.22, h * 0.09, h * 0.035]) {
    ctx.shadowBlur = blur;
    ctx.drawImage(pink, lx, ly, lw, lockH);
  }
  ctx.restore();
  ctx.save();
  ctx.shadowColor = "rgba(255,200,225,0.9)";
  ctx.shadowBlur = h * 0.02;
  ctx.globalAlpha = 0.92;
  ctx.drawImage(tint("#ffe6f1"), lx + lockH * 0.012, ly + lockH * 0.012, lw - lockH * 0.024, lockH - lockH * 0.024);
  ctx.restore();

  // credits, either side, set like a cabinet's small print
  const side = (lines: [string, string], x: number, align: CanvasTextAlign) => {
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.letterSpacing = `${Math.round(h * 0.018)}px`;
    ctx.font = `600 ${Math.round(h * 0.075)}px ${UI_FONT}`;
    ctx.fillStyle = "rgba(255,226,238,0.82)";
    ctx.fillText(lines[0], x, h * 0.43);
    ctx.font = `500 ${Math.round(h * 0.06)}px ${UI_FONT}`;
    ctx.fillStyle = "rgba(255,150,195,0.7)";
    ctx.fillText(lines[1], x, h * 0.585);
  };
  side(["ONCHAIN PRIZE CATCHER", "MODEL C-10  ·  SOLANA"], h * 0.32, "left");
  side(["POWERED BY MAGICBLOCK", "EVERY GRIP A VRF ROLL"], w - h * 0.32, "right");
  ctx.letterSpacing = "0px";
  // rules between the credits and the sign
  ctx.fillStyle = "rgba(255,110,170,0.4)";
  for (const x of [w * 0.29, w * 0.71]) ctx.fillRect(x - 1, h * 0.3, 2, h * 0.4);
};

/**
 * Dot-matrix credit display: text rasterised to a coarse grid, every cell an
 * LED, lit ones glowing pink over the faint grid of dark ones.
 */
export const drawCreditDisplay: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#0a0609";
  ctx.fillRect(0, 0, w, h);
  const cols = 60;
  const rows = 24;
  const cell = w / cols;
  // rasterise the text at grid resolution
  const g = document.createElement("canvas");
  g.width = cols;
  g.height = rows;
  const t = g.getContext("2d") as CanvasRenderingContext2D;
  t.fillStyle = "#fff";
  t.textAlign = "center";
  t.textBaseline = "middle";
  t.font = `700 11px ${UI_FONT}`;
  t.fillText("FREE PLAY", cols / 2, 8);
  t.font = `600 7px ${UI_FONT}`;
  t.fillText("ON DEVNET", cols / 2, 18.5);
  const px = t.getImageData(0, 0, cols, rows).data;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const a = (px[(y * cols + x) * 4 + 3] ?? 0) / 255;
      const cx = (x + 0.5) * cell;
      const cy = (y + 0.5) * (h / rows);
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.34, 0, Math.PI * 2);
      if (a > 0.35) {
        ctx.shadowColor = "rgba(255,60,140,0.9)";
        ctx.shadowBlur = cell * 0.9;
        ctx.fillStyle = y < 13 ? "#ff7ab3" : "#ffb8d6";
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,90,150,0.07)";
      }
      ctx.fill();
    }
  ctx.shadowBlur = 0;
};

export type BodyFrontLayout = {
  width: number;
  height: number;
  /** the prize door window, metres from the panel centre */
  door: { x: number; y: number; w: number; h: number };
};

/**
 * The body front's print: blush lacquer, pinstripe rings stepping out from
 * the prize door like a target, a glow spilling from the opening, and double
 * pinstripes down both edges. The door window is left clear (alpha 0).
 */
export function drawBodyFront(l: BodyFrontLayout): Draw {
  return (ctx, w, h) => {
    const k = w / l.width;
    const X = (x: number) => (x + l.width / 2) * k;
    const Y = (y: number) => (l.height / 2 - y) * k;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#fbd3e1");
    bg.addColorStop(1, "#f3b2c9");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const dx = X(l.door.x);
    const dy = Y(l.door.y);
    // sunburst: rays fanning out of the prize door, fading as they climb
    ctx.save();
    const rays = 28;
    const reach = Math.hypot(w, h) * 1.1;
    for (let i = 0; i < rays; i++) {
      if (i % 2) continue;
      const a0 = (i / rays) * Math.PI * 2;
      const a1 = ((i + 1) / rays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx + Math.cos(a0) * reach, dy + Math.sin(a0) * reach);
      ctx.lineTo(dx + Math.cos(a1) * reach, dy + Math.sin(a1) * reach);
      ctx.closePath();
      const rg = ctx.createRadialGradient(dx, dy, 0, dx, dy, w * 0.75);
      rg.addColorStop(0, "rgba(232,71,143,0.2)");
      rg.addColorStop(1, "rgba(232,71,143,0.03)");
      ctx.fillStyle = rg;
      ctx.fill();
    }
    ctx.restore();
    // glow from the opening
    const glow = ctx.createRadialGradient(dx, dy, l.door.w * k * 0.3, dx, dy, l.door.w * k * 1.05);
    glow.addColorStop(0, "rgba(255,90,160,0.32)");
    glow.addColorStop(1, "rgba(255,90,160,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // target rings
    const ring = (pad: number, lw: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw * k;
      roundRect(
        ctx,
        dx - ((l.door.w / 2 + pad) * k),
        dy - ((l.door.h / 2 + pad) * k),
        (l.door.w + pad * 2) * k,
        (l.door.h + pad * 2) * k,
        (0.02 + pad) * k,
      );
      ctx.stroke();
    };
    ring(0.026, 0.004, PALETTE.hotPink);
    ring(0.042, 0.0016, "rgba(232,71,143,0.6)");
    ring(0.056, 0.0008, "rgba(232,71,143,0.35)");

    // edge pinstripes
    ctx.fillStyle = PALETTE.hotPink;
    for (const x of [0.022, l.width - 0.022 - 0.004]) ctx.fillRect(x * k, 0.02 * k, 0.004 * k, h - 0.04 * k);
    ctx.fillStyle = "rgba(232,71,143,0.5)";
    for (const x of [0.032, l.width - 0.032 - 0.0016]) ctx.fillRect(x * k, 0.02 * k, 0.0016 * k, h - 0.04 * k);

    // the window
    ctx.clearRect(dx - (l.door.w / 2) * k, dy - (l.door.h / 2) * k, l.door.w * k, l.door.h * k);
  };
}

/** Speaker grille: a field of punched holes in dark steel, fading to the rim. */
export const drawGrille: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#2a2229";
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const step = w / 17;
  for (let y = step / 2; y < h; y += step)
    for (let x = step / 2 + ((Math.round(y / step) % 2) * step) / 2; x < w; x += step) {
      const d = Math.hypot(x - cx, y - cy) / (w / 2);
      if (d > 0.9) continue;
      ctx.fillStyle = "#07050a";
      ctx.beginPath();
      ctx.arc(x, y, step * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // the lit lip of each hole
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(x, y + step * 0.08, step * 0.3, 0, Math.PI);
      ctx.fill();
    }
  const v = ctx.createRadialGradient(cx, cy, w * 0.2, cx, cy, w * 0.5);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
};

/** Player plate: backlit legend in a black acrylic plate. */
export function drawPlayerPlate(label: string): Draw {
  return (ctx, w, h) => {
    ctx.fillStyle = "#0d090f";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.round(h * 0.46)}px ${UI_FONT}`;
    ctx.letterSpacing = `${Math.round(h * 0.14)}px`;
    ctx.shadowColor = "rgba(255,60,140,0.9)";
    ctx.shadowBlur = h * 0.25;
    ctx.fillStyle = "#ffd3e6";
    ctx.fillText(label, w / 2 + h * 0.07, h * 0.54);
    ctx.shadowBlur = 0;
    ctx.letterSpacing = "0px";
  };
}

/**
 * Width of the claw mark at the left of a lockup mask: up to the start of the
 * first wide clear gap (the space before the wordmark; the gaps between the
 * mark's own dots are much narrower).
 */
function markWidth(mask: HTMLCanvasElement) {
  const ctx = mask.getContext("2d") as CanvasRenderingContext2D;
  const { data, width, height } = ctx.getImageData(0, 0, mask.width, mask.height);
  const wide = height * 0.15;
  let run = 0;
  for (let x = 0; x < width; x++) {
    let any = false;
    for (let y = 0; y < height; y++)
      if ((data[(y * width + x) * 4 + 3] ?? 0) > 10) {
        any = true;
        break;
      }
    run = any ? 0 : run + 1;
    if (run >= wide) return x - run + 1;
  }
  return Math.round(height * 0.975);
}

/**
 * Cabinet side: lacquer pink with the claw mark at poster scale, the wordmark
 * under it, and racing stripes running to the floor. Symmetric, so it reads
 * the same on both sides of the machine.
 */
export const drawSidePanel: Draw = (ctx, w, h) => {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#ee5a9a");
  bg.addColorStop(1, PALETTE.hotPinkDeep);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // soft light falling across the panel
  const lift = ctx.createRadialGradient(w * 0.5, h * 0.3, w * 0.05, w * 0.5, h * 0.3, w * 0.8);
  lift.addColorStop(0, "rgba(255,255,255,0.16)");
  lift.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = lift;
  ctx.fillRect(0, 0, w, h);

  // the mark, big, in blush
  const markH = w * 0.52;
  const mark = clawLockupMask(markH * 2, UI_FONT);
  // crop the mark out of the lockup: scan for the first empty column after it
  const mw = markWidth(mark);
  const s = markH / mark.height;
  ctx.globalAlpha = 0.95;
  const tinted = document.createElement("canvas");
  tinted.width = mark.width;
  tinted.height = mark.height;
  const t = tinted.getContext("2d") as CanvasRenderingContext2D;
  t.drawImage(mark, 0, 0);
  t.globalCompositeOperation = "source-in";
  t.fillStyle = "#ffe1ec";
  t.fillRect(0, 0, tinted.width, tinted.height);
  ctx.shadowColor = "rgba(120,10,60,0.35)";
  ctx.shadowBlur = w * 0.02;
  ctx.shadowOffsetY = w * 0.008;
  ctx.drawImage(tinted, 0, 0, mw, mark.height, w / 2 - (mw * s) / 2, h * 0.14, mw * s, markH);
  ctx.globalAlpha = 1;

  // the wordmark
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const size = w * 0.3;
  ctx.font = `600 ${Math.round(size)}px ${UI_FONT}`;
  ctx.letterSpacing = `${(-0.06 * size).toFixed(1)}px`;
  ctx.fillStyle = "#fff4f8";
  ctx.fillText("claw", w / 2, h * 0.14 + markH + size * 0.95);
  ctx.shadowColor = "transparent";
  ctx.letterSpacing = `${Math.round(w * 0.012)}px`;
  ctx.font = `600 ${Math.round(w * 0.032)}px ${UI_FONT}`;
  ctx.fillStyle = "rgba(255,236,244,0.8)";
  ctx.fillText("ONCHAIN PRIZE CATCHER  ·  MAGICBLOCK", w / 2, h * 0.14 + markH + size * 1.32);
  ctx.letterSpacing = "0px";

  // racing stripes to the floor
  const y0 = h * 0.86;
  const stripes: [number, string][] = [
    [0.03, "rgba(255,240,246,0.92)"],
    [0.012, "rgba(255,240,246,0.65)"],
    [0.006, "rgba(255,240,246,0.45)"],
  ];
  let y = y0;
  for (const [hh, c] of stripes) {
    ctx.fillStyle = c;
    ctx.fillRect(0, y, w, h * hh);
    y += h * hh + h * 0.012;
  }
};

/** Where everything on the button deck sits, in metres from the print's centre (+y away from the player). */
export type DeckLayout = {
  width: number;
  height: number;
  legends: { x: number; y: number; text: string }[];
  rings: { x: number; y: number; r: number }[];
  dividers: { x: number; y0: number; y1: number }[];
  /** each logo's centre and cut height */
  solana: { x: number; y: number; h: number };
  magic: { x: number; y: number; h: number };
  claw: { x: number; y: number; h: number };
  /** cap height of the legend lettering */
  legendH: number;
};


/**
 * Button deck print, as engraved black acrylic. `color` paints the panel and
 * the paint in each cut; `bump` paints the cut depth, so the logos and legends
 * pick up real light at their edges. Solana far left, MagicBlock far right,
 * the claw lockup between the two stations.
 */
export function drawDeck(layout: DeckLayout, mode: "color" | "bump"): Draw {
  return (ctx, w, h) => {
    const k = w / layout.width;
    const X = (x: number) => (x + layout.width / 2) * k;
    const Y = (y: number) => (layout.height / 2 - y) * k;
    const bump = mode === "bump";

    // the acrylic
    if (bump) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
    } else {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#19121c");
      bg.addColorStop(1, "#0a070c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      // faint polish streak across the sheet
      const sheen = ctx.createLinearGradient(0, 0, w, h);
      sheen.addColorStop(0.35, "rgba(255,255,255,0)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0.035)");
      sheen.addColorStop(0.65, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, w, h);
    }

    // routed groove around the edge, and the target rings round the big buttons
    const inset = 0.006 * k;
    ctx.lineWidth = Math.max(2, 0.0012 * k);
    ctx.strokeStyle = bump ? "#000" : "rgba(236,63,140,0.92)";
    if (bump) ctx.filter = "blur(1px)";
    roundRect(ctx, inset, inset, w - inset * 2, h - inset * 2, 0.008 * k);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, 0.0008 * k);
    for (const r of layout.rings) {
      ctx.beginPath();
      ctx.arc(X(r.x), Y(r.y), r.r * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    // hairline cuts between the zones
    ctx.strokeStyle = bump ? "#000" : "rgba(255,240,246,0.13)";
    ctx.lineWidth = Math.max(1, 0.0005 * k);
    for (const d of layout.dividers) {
      ctx.beginPath();
      ctx.moveTo(X(d.x), Y(d.y0));
      ctx.lineTo(X(d.x), Y(d.y1));
      ctx.stroke();
    }
    ctx.filter = "none";

    const cut = (
      mask: Mask,
      x: number,
      y: number,
      hM: number,
      fill: Parameters<typeof engrave>[5],
    ) => {
      if (bump) engraveDepth(ctx, mask, X(x), Y(y), hM * k);
      else engrave(ctx, mask, X(x), Y(y), hM * k, fill);
    };

    // legends: satin white paint in the cut
    const legendPx = layout.legendH * k;
    for (const l of layout.legends) {
      cut(textMask(l.text, legendPx * 1.4, UI_FONT, 600, 0.2), l.x, l.y, layout.legendH, "rgba(255,243,248,0.86)");
    }

    // Solana, in its own gradient
    const sol = layout.solana;
    cut(solanaMask(sol.h * k * 2), sol.x, sol.y, sol.h, (c, cw, chh) => {
      const g = c.createLinearGradient(0, chh, cw, 0);
      g.addColorStop(0.08, "#9945FF");
      g.addColorStop(0.5, "#5497D5");
      g.addColorStop(0.97, "#19FB9B");
      c.fillStyle = g;
      c.fillRect(0, 0, cw, chh);
    });

    // MagicBlock, satin silver
    const mb = magicBlockMask();
    if (mb) {
      cut(mb, layout.magic.x, layout.magic.y, layout.magic.h, (c, cw, chh) => {
        const g = c.createLinearGradient(0, 0, 0, chh);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(1, "#c9c2cf");
        c.fillStyle = g;
        c.fillRect(0, 0, cw, chh);
      });
    }

    // the claw lockup, paint-filled in the cabinet's lacquer pink
    const cl = layout.claw;
    cut(clawLockupMask(cl.h * k * 2, UI_FONT), cl.x, cl.y, cl.h, (c, cw, chh) => {
      const g = c.createLinearGradient(0, 0, 0, chh);
      g.addColorStop(0, "#ff6aa8");
      g.addColorStop(1, PALETTE.hotPinkDeep);
      c.fillStyle = g;
      c.fillRect(0, 0, cw, chh);
    });
  };
}

export type BoxArt = { label: string; ink: string; foilA: string; foilB: string; tier: string };

/**
 * Collector box face. `color` paints the print; `foil` paints a
 * roughness (green) + metalness (blue) map so the stamped parts catch light.
 */
export function drawPrizeBox(art: BoxArt, mode: "color" | "foil"): Draw {
  return (ctx, w, h) => {
    const foil = (a: string, b: string) => {
      if (mode === "foil") return "rgb(0,46,255)";
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, a);
      g.addColorStop(0.5, b);
      g.addColorStop(1, a);
      return g;
    };
    const paper = mode === "foil" ? "rgb(0,150,0)" : art.ink;
    const quiet = mode === "foil" ? "rgb(0,150,0)" : "rgba(255,245,238,0.7)";

    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);

    if (mode === "color") {
      // soft vignette so the face isn't flat
      const v = ctx.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.45, h * 0.7);
      v.addColorStop(0, "rgba(255,255,255,0.09)");
      v.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.strokeStyle = foil(art.foilA, art.foilB);
    ctx.lineWidth = 5;
    roundRect(ctx, 20, 20, w - 40, h - 40, 16);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    roundRect(ctx, 32, 32, w - 64, h - 64, 9);
    ctx.stroke();

    // stamped sunburst behind the ticker
    ctx.save();
    ctx.translate(w / 2, h * 0.47);
    ctx.globalAlpha = mode === "foil" ? 1 : 0.22;
    for (let i = 0; i < 36; i++) {
      ctx.rotate(Math.PI / 18);
      ctx.fillStyle = foil(art.foilA, art.foilB);
      ctx.fillRect(-1, h * 0.17, 2, h * 0.1);
    }
    ctx.restore();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = foil(art.foilA, art.foilB);
    const size = Math.min((w * 0.74) / (art.label.length * 0.62), h * 0.26);
    ctx.font = display(size);
    ctx.fillText(art.label, w / 2, h * 0.47);

    ctx.fillStyle = quiet;
    ctx.font = mono(h * 0.034);
    ctx.letterSpacing = "3px";
    ctx.fillText(art.tier, w / 2, h * 0.13);
    ctx.fillText("Settles to your wallet", w / 2, h * 0.87);
    ctx.letterSpacing = "0px";
  };
}

/** Coin face. `bump` paints a height map: rim and lettering raised. */
export function drawCoin(label: string, mode: "color" | "bump"): Draw {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    if (mode === "color") {
      const g = ctx.createRadialGradient(w * 0.38, h * 0.32, 4, cx, cy, w * 0.6);
      g.addColorStop(0, "#fff0bd");
      g.addColorStop(0.55, "#f1c453");
      g.addColorStop(1, "#b98416");
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = "#505050";
    }
    ctx.fillRect(0, 0, w, h);

    const raised = mode === "color" ? "rgba(255,244,200,0.55)" : "#ffffff";
    const sunk = mode === "color" ? "rgba(120,78,6,0.55)" : "#1c1c1c";

    ctx.strokeStyle = raised;
    ctx.lineWidth = w * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.455, 0, Math.PI * 2);
    ctx.stroke();

    // beaded inner ring
    ctx.fillStyle = raised;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(a) * w * 0.385,
        cy + Math.sin(a) * w * 0.385,
        w * 0.011,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.strokeStyle = sunk;
    ctx.lineWidth = w * 0.012;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.34, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = display((w * 0.6) / (label.length * 0.62 + 0.5));
    ctx.fillStyle = mode === "color" ? "#8a5d05" : "#ffffff";
    ctx.fillText(label, cx, cy + w * 0.015);
  };
}

/** Small printed legend above the prize bin. */
export const drawPrizeOut: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#0d090f";
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(h * 0.5)}px ${UI_FONT}`;
  ctx.letterSpacing = `${Math.round(h * 0.2)}px`;
  ctx.shadowColor = "rgba(255,50,140,0.95)";
  for (const b of [h * 0.5, h * 0.2]) {
    ctx.shadowBlur = b;
    ctx.fillStyle = "#ff4f9c";
    ctx.fillText("PRIZE", w / 2 + h * 0.1, h * 0.54);
  }
  ctx.shadowBlur = h * 0.05;
  ctx.fillStyle = "#ffe5f0";
  ctx.fillText("PRIZE", w / 2 + h * 0.1, h * 0.54);
  ctx.letterSpacing = "0px";
  // arrows pointing down to the door
  ctx.fillStyle = "#ff7ab3";
  for (const x of [w * 0.12, w * 0.88]) {
    ctx.beginPath();
    ctx.moveTo(x - h * 0.13, h * 0.42);
    ctx.lineTo(x + h * 0.13, h * 0.42);
    ctx.lineTo(x, h * 0.66);
    ctx.closePath();
    ctx.fill();
  }
};

/** Rating plate riveted to the back, like the one on any real cabinet. */
export const drawRatingPlate: Draw = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#d9dbe0");
  g.addColorStop(0.5, "#f1f2f5");
  g.addColorStop(1, "#c9cbd2");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // brushed grain
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#000";
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "#2a2a30";
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.fillStyle = "#1c1c22";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = display(h * 0.17);
  ctx.fillText("CLAW prize catcher", 36, h * 0.2);
  ctx.font = mono(h * 0.085);
  const rows = [
    ["Model", "C-10 two player"],
    ["Network", "Solana devnet"],
    ["Runtime", "MagicBlock Ephemeral Rollup"],
    ["Randomness", "MagicBlock VRF"],
    ["Program", "2gjcfh2Y...5YDYSLo"],
    ["Input", "100-240V ~ 50/60Hz 180W"],
  ] as const;
  rows.forEach(([k, v], i) => {
    const y = h * 0.4 + i * h * 0.095;
    ctx.fillText(k, 36, y);
    ctx.fillText(v, w * 0.36, y);
    ctx.fillRect(36, y + h * 0.045, w - 72, 1);
  });
};

/** Soft radial falloff used for glows and light halos. */
export const drawGlow: Draw = (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};
