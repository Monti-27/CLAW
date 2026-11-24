"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box2,
  type BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  type Material,
  type Shape,
  Vector2,
  Vector3,
} from "three";
import { SVGLoader } from "three-stdlib";

type Props = {
  /** path of an SVG under /public, e.g. /brand/solana.svg */
  src: string;
  /** box the artwork is fitted into, meters */
  width: number;
  height: number;
  /** how far it stands proud of the surface, meters */
  relief?: number;
  material: Material;
  /** called when there is no usable file at `src` */
  onMissing?: () => void;
};

const boundsOf = (shape: Shape) => new Box2().setFromPoints(shape.getPoints(8));
const area = (b: Box2) => {
  const s = b.getSize(new Vector2());
  return s.x * s.y;
};

/** Turns the filled paths of an SVG into one extruded, centered, fitted geometry. */
function buildRelief(
  svg: string,
  width: number,
  height: number,
  relief: number,
): BufferGeometry | null {
  const { paths } = new SVGLoader().parse(svg);
  let shapes = paths
    .filter((p) => p.userData?.style?.fill && p.userData.style.fill !== "none")
    .flatMap((p) => SVGLoader.createShapes(p as Parameters<typeof SVGLoader.createShapes>[0]));
  if (!shapes.length) return null;

  // drop a full-bleed background plate if the file has one
  const all = new Box2();
  for (const s of shapes) all.union(boundsOf(s));
  if (shapes.length > 1) shapes = shapes.filter((s) => area(boundsOf(s)) < area(all) * 0.97);
  if (!shapes.length) return null;

  const geo = new ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 24 });
  geo.center();
  geo.computeBoundingBox();
  const size = geo.boundingBox?.getSize(new Vector3());
  if (!size) return null;
  const fit = Math.min(width / size.x, height / size.y);
  // SVG y runs downward, so flip it; depth becomes the relief
  geo.scale(fit, -fit, relief);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Inlays vector artwork into the cabinet as real geometry. Renders nothing
 * until the file exists, so the slot is safe to ship empty.
 */
export function Engraving({ src, width, height, relief = 0.003, material, onMissing }: Props) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  // kept in a ref so a new callback identity never refetches the file
  const missing = useRef(onMissing);
  missing.current = onMissing;

  useEffect(() => {
    let alive = true;
    let built: BufferGeometry | null = null;
    fetch(src)
      .then((r) =>
        r.ok && (r.headers.get("content-type") ?? "").includes("svg") ? r.text() : null,
      )
      .then((text) => {
        if (!alive) return;
        built = text ? buildRelief(text, width, height, relief) : null;
        if (built) setGeometry(built);
        else missing.current?.();
      })
      .catch(() => missing.current?.());
    return () => {
      alive = false;
      built?.dispose();
    };
  }, [src, width, height, relief]);

  if (!geometry) return null;
  material.side = DoubleSide;
  return <mesh geometry={geometry} material={material} position={[0, 0, relief / 2]} castShadow />;
}
