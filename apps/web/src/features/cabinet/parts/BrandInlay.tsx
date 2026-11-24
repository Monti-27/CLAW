"use client";

import { useEffect, useMemo, useState } from "react";
import { type MeshStandardMaterial, SRGBColorSpace, type Texture, TextureLoader } from "three";
import { getMaterials } from "../materials";
import { Engraving } from "./Engraving";

type Props = { name: string; width: number; height: number };

/**
 * Fills a plaque well from /public/brand. A vector file (<name>.svg) becomes
 * a raised gold inlay. With only an image (<name>.png) the mark is still set
 * in gold: a flat light-on-dark image is used as a stencil, anything else is
 * shown as a printed badge. With neither file, the well stays empty.
 */
export function BrandInlay({ name, width, height }: Props) {
  const m = getMaterials();
  const [vector, setVector] = useState(true);
  return vector ? (
    <Engraving
      src={`/brand/${name}.svg`}
      width={width}
      height={height}
      relief={0.006}
      material={m.inlay}
      onMissing={() => setVector(false)}
    />
  ) : (
    <ImageInlay src={`/brand/${name}.png`} width={width} height={height} />
  );
}

type Crop = { u: number; v: number; w: number; h: number };

/**
 * Reads the image at low resolution. If it is an opaque light-on-dark mark it
 * can be used as a stencil; the result is the box the bright part occupies
 * (as fractions of the image), so padding around the mark is trimmed away.
 */
function stencilCrop(image: CanvasImageSource): Crop | null {
  const n = 96;
  const canvas = document.createElement("canvas");
  canvas.width = n;
  canvas.height = n;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, n, n);
  const px = ctx.getImageData(0, 0, n, n).data;
  const lum = (i: number) => (px[i] ?? 0) + (px[i + 1] ?? 0) + (px[i + 2] ?? 0);
  if ((px[3] ?? 0) < 250 || lum(0) > 90) return null;

  let x0 = n;
  let y0 = n;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (lum((y * n + x) * 4) < 380) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0) return null;
  const pad = 2;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(n - 1, x1 + pad);
  y1 = Math.min(n - 1, y1 + pad);
  // texture v runs bottom to top, canvas y top to bottom
  return { u: x0 / n, v: 1 - (y1 + 1) / n, w: (x1 - x0 + 1) / n, h: (y1 - y0 + 1) / n };
}

function ImageInlay({ src, width, height }: { src: string; width: number; height: number }) {
  const m = getMaterials();
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let alive = true;
    let loaded: Texture | null = null;
    new TextureLoader().load(
      src,
      (t) => {
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = 8;
        loaded = t;
        if (alive) setTexture(t);
      },
      undefined,
      () => undefined,
    );
    return () => {
      alive = false;
      loaded?.dispose();
    };
  }, [src]);

  // the bright part of the image becomes gold; the dark part disappears into the well
  const stencil = useMemo(() => {
    const crop = texture ? stencilCrop(texture.image as HTMLImageElement) : null;
    if (!texture || !crop) return null;
    texture.offset.set(crop.u, crop.v);
    texture.repeat.set(crop.w, crop.h);
    const material = (m.inlay as MeshStandardMaterial).clone();
    material.alphaMap = texture;
    material.bumpMap = texture;
    material.bumpScale = 3;
    material.transparent = true;
    return { material, crop };
  }, [texture, m]);

  if (!texture) return null;
  const image = texture.image as { width: number; height: number };
  const iw = image.width * (stencil?.crop.w ?? 1);
  const ih = image.height * (stencil?.crop.h ?? 1);
  const fit = Math.min(width / iw, height / ih);
  const size: [number, number] = [iw * fit, ih * fit];

  return stencil ? (
    <mesh position={[0, 0, 0.003]} material={stencil.material}>
      <planeGeometry args={size} />
    </mesh>
  ) : (
    <mesh position={[0, 0, 0.0012]}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.28}
        roughness={0.3}
        transparent
      />
    </mesh>
  );
}
