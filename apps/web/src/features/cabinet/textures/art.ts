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

const display = (px: number, weight = 800) => `${weight} ${Math.round(px)}px ${DISPLAY_FONT}`;
const mono = (px: number, weight = 500) => `${weight} ${Math.round(px)}px ${MONO_FONT}`;

/** Backlit header: a cream light panel, the wordmark in lacquer pink, quiet keylines. */
export const drawMarquee: Draw = (ctx, w, h) => {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#ffe3ee");
  bg.addColorStop(0.5, "#fffafc");
  bg.addColorStop(1, "#ffd9e7");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // hot spot, like tubes behind the acrylic
  const glow = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.42);
  glow.addColorStop(0, "rgba(255,255,255,0.95)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = PALETTE.hotPink;
  ctx.lineWidth = 5;
  roundRect(ctx, 26, 24, w - 52, h - 48, 22);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  roundRect(ctx, 40, 38, w - 80, h - 76, 14);
  ctx.stroke();

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const size = h * 0.66;
  ctx.font = display(size);
  ctx.letterSpacing = `${Math.round(size * 0.02)}px`;
  const ink = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.85);
  ink.addColorStop(0, "#ff5c9d");
  ink.addColorStop(1, PALETTE.hotPinkDeep);
  ctx.fillStyle = ink;
  ctx.fillText("CLAW", w / 2, h * 0.54);

  // side notes, set small like the legends printed on real cabinets
  ctx.letterSpacing = "3px";
  ctx.font = mono(h * 0.075);
  ctx.fillStyle = PALETTE.hotPinkDeep;
  ctx.textAlign = "left";
  ctx.fillText("Onchain prize catcher", 84, h * 0.4);
  ctx.fillText("Model C-10", 84, h * 0.6);
  ctx.textAlign = "right";
  ctx.fillText("Every grip is a", w - 84, h * 0.4);
  ctx.fillText("verifiable random roll", w - 84, h * 0.6);

  // keyline ticks between notes and wordmark
  ctx.fillStyle = PALETTE.hotPink;
  for (const x of [w * 0.3, w * 0.7]) ctx.fillRect(x - 1, h * 0.3, 2, h * 0.4);
};

/** Tower front: hourglass of pink pinstripes on blush. */
export const drawTowerPanel: Draw = (ctx, w, h) => {
  ctx.fillStyle = PALETTE.blushLight;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.04);
  ctx.lineTo(w * 0.92, h * 0.04);
  ctx.lineTo(w * 0.5, h * 0.5);
  ctx.lineTo(w * 0.92, h * 0.96);
  ctx.lineTo(w * 0.08, h * 0.96);
  ctx.lineTo(w * 0.5, h * 0.5);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = PALETTE.hotPink;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const step = h / 46;
  for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, step * 0.34);
  ctx.restore();

  ctx.strokeStyle = PALETTE.hotPinkDeep;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
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

const UI_FONT = "Geist, system-ui, sans-serif";

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
  ctx.fillStyle = "#120d15";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PALETTE.paper;
  ctx.font = mono(h * 0.42);
  ctx.letterSpacing = `${Math.round(h * 0.16)}px`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PRIZE OUT", w / 2, h * 0.54);
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
