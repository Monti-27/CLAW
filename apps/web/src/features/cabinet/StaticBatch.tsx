"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";
import {
  BufferAttribute,
  type BufferGeometry,
  type Group,
  type Material,
  Matrix4,
  Mesh,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Handlers = { __r3f?: { handlers?: Record<string, unknown> } };

const KEEP = ["position", "normal", "uv"] as const;

/** Brings a geometry to the shared layout mergeGeometries needs. */
function normalize(source: BufferGeometry, matrix: Matrix4) {
  const g = source.clone();
  g.applyMatrix4(matrix);
  for (const name of Object.keys(g.attributes)) {
    if (!(KEEP as readonly string[]).includes(name)) g.deleteAttribute(name);
  }
  const count = g.attributes.position?.count ?? 0;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute("uv", new BufferAttribute(new Float32Array(count * 2), 2));
  if (!g.index) {
    const index = new Uint32Array(count);
    for (let i = 0; i < count; i++) index[i] = i;
    g.setIndex(new BufferAttribute(index, 1));
  }
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

/**
 * Everything inside that never moves is baked into one mesh per material
 * after the first commit, so a few hundred boxes, rails and bolts cost a few
 * dozen draw calls. Moving parts opt out with userData={{ noMerge: true }} on
 * any ancestor group; meshes with pointer handlers and transparent meshes
 * are left alone too. The originals stay mounted (React owns them) but hidden.
 */
export function StaticBatch({ children }: { children: ReactNode }) {
  const root = useRef<Group>(null);

  useLayoutEffect(() => {
    const g = root.current;
    if (!g) return;
    g.updateWorldMatrix(true, true);
    const toLocal = new Matrix4().copy(g.matrixWorld).invert();

    const buckets = new Map<Material, { geos: BufferGeometry[]; shadow: boolean; sources: Mesh[] }>();
    const walk = (o: { children: unknown[]; userData: Record<string, unknown> }) => {
      if (o.userData.noMerge) return;
      for (const child of o.children as Mesh[]) {
        if (child.userData.noMerge) continue;
        const mesh = child as Mesh & Handlers;
        const plain =
          mesh.isMesh &&
          !(mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh &&
          !Array.isArray(mesh.material) &&
          !(mesh.material as Material).transparent &&
          mesh.visible &&
          Object.keys(mesh.__r3f?.handlers ?? {}).length === 0;
        if (plain) {
          const mat = mesh.material as Material;
          const m = new Matrix4().multiplyMatrices(toLocal, mesh.matrixWorld);
          const bucket = buckets.get(mat) ?? { geos: [], shadow: false, sources: [] };
          bucket.geos.push(normalize(mesh.geometry, m));
          bucket.shadow ||= mesh.castShadow;
          bucket.sources.push(mesh);
          buckets.set(mat, bucket);
        }
        walk(child as never);
      }
    };
    walk(g as never);

    const made: Mesh[] = [];
    for (const [material, b] of buckets) {
      if (b.sources.length < 2) continue;
      const merged = mergeGeometries(b.geos, false);
      for (const geo of b.geos) geo.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new Mesh(merged, material);
      mesh.castShadow = b.shadow;
      mesh.receiveShadow = true;
      mesh.userData.merged = true;
      g.add(mesh);
      made.push(mesh);
      for (const s of b.sources) s.visible = false;
    }

    return () => {
      for (const mesh of made) {
        g.remove(mesh);
        mesh.geometry.dispose();
      }
      g.traverse((o) => {
        if (!o.userData.merged) o.visible = true;
      });
    };
  }, []);

  return <group ref={root}>{children}</group>;
}
