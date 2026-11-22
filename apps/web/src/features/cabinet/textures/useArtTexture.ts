"use client";

import { useEffect, useMemo } from "react";
import { type Draw, paintTexture, repaint } from "./canvas";

const FONTS = [
  '800 48px "Bricolage Grotesque Variable"',
  '500 48px "Bricolage Grotesque Variable"',
  '500 48px "Geist Mono Variable"',
  "600 48px Geist",
];

/**
 * A canvas-painted texture that repaints once the self-hosted fonts are ready,
 * so the first frame never shows a fallback face for long.
 */
export function useArtTexture(width: number, height: number, draw: Draw) {
  const texture = useMemo(() => paintTexture(width, height, draw), [width, height, draw]);

  useEffect(() => {
    let alive = true;
    Promise.all(FONTS.map((f) => document.fonts.load(f)))
      .then(() => alive && repaint(texture, draw))
      .catch(() => undefined);
    return () => {
      alive = false;
      texture.dispose();
    };
  }, [texture, draw]);

  return texture;
}
