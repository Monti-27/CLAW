"use client";

import { useMemo } from "react";
import { ExtrudeGeometry, Shape } from "three";

/** Rounded-rectangle path, centred, as a three Shape (or a hole in one). */
export function roundedRect(w: number, h: number, r: number, shape: Shape = new Shape()) {
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  shape.moveTo(x + rr, y);
  shape.lineTo(x + w - rr, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + rr);
  shape.lineTo(x + w, y + h - rr);
  shape.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  shape.lineTo(x + rr, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - rr);
  shape.lineTo(x, y + rr);
  shape.quadraticCurveTo(x, y, x + rr, y);
  return shape;
}

/**
 * A bevelled frame with rounded corners: the chrome bezel round a door, a
 * display or a light box. `w`/`h` are the opening; `band` the frame width.
 * Its back sits at z = 0 and it stands `depth` proud.
 */
export function useBezelGeometry(w: number, h: number, band: number, depth: number, radius: number) {
  return useMemo(() => {
    const outer = roundedRect(w + band * 2, h + band * 2, radius + band);
    const hole = roundedRect(w, h, radius);
    outer.holes.push(hole);
    const bevel = Math.min(band * 0.35, depth * 0.45);
    const g = new ExtrudeGeometry(outer, {
      depth: depth - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 0.8,
      bevelSegments: 3,
      curveSegments: 10,
    });
    g.translate(0, 0, bevel);
    return g;
  }, [w, h, band, depth, radius]);
}

/** A flat rounded-rectangle plate (for lit faces and inlays). */
export function usePlateGeometry(w: number, h: number, depth: number, radius: number) {
  return useMemo(() => {
    const bevel = Math.min(depth * 0.4, radius * 0.5);
    const g = new ExtrudeGeometry(roundedRect(w, h, radius), {
      depth: Math.max(0.0001, depth - bevel * 2),
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 0.8,
      bevelSegments: 3,
      curveSegments: 10,
    });
    g.translate(0, 0, bevel);
    return g;
  }, [w, h, depth, radius]);
}
