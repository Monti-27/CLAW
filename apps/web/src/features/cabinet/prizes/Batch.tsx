"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  type BufferGeometry,
  type Color,
  Euler,
  type InstancedMesh,
  type Material,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import { CAPSULE_R } from "./layout";
import { capsuleKit, capsuleLook } from "./shapes";

export type Slot = { matrix: Matrix4; color?: Color };
export type Vec3 = [number, number, number];

export const compose = (p: Vec3, rot: Vec3, scale?: Vector3) =>
  new Matrix4().compose(
    new Vector3(...p),
    new Quaternion().setFromEuler(new Euler(...rot)),
    scale ?? new Vector3(1, 1, 1),
  );

/** One instanced draw for a list of transforms (and optional per-instance color). */
export function Batch({
  slots,
  geometry,
  material,
  shadow = true,
  receive = shadow,
  order,
}: {
  slots: Slot[];
  geometry: BufferGeometry;
  material: Material;
  shadow?: boolean;
  receive?: boolean;
  order?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  // capacity never shrinks, so a prize leaving the pile doesn't reallocate
  const capacity = useRef(Math.max(1, slots.length));
  capacity.current = Math.max(capacity.current, slots.length);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    slots.forEach((s, i) => {
      m.setMatrixAt(i, s.matrix);
      if (s.color) m.setColorAt(i, s.color);
    });
    m.count = slots.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [slots]);

  if (slots.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, capacity.current]}
      castShadow={shadow}
      receiveShadow={receive}
      renderOrder={order}
      frustumCulled={false}
    />
  );
}

const r = CAPSULE_R;
const LOCAL = {
  floor: compose([0, 0.0004, 0], [-Math.PI / 2, 0, 0]),
  lip: compose([0, 0, 0], [Math.PI / 2, 0, 0]),
};

export type CapsuleSpec = { id: string; color: string; matrix: Matrix4 };

/**
 * Every capsule in a list, five instanced draws however many there are:
 * candy base, its inner floor, the snap lip, the toy inside, and the clear dome
 * last (it's see-through, so it draws after what's behind and inside it).
 */
export function Capsules({ items }: { items: CapsuleSpec[] }) {
  const kit = capsuleKit();
  const slots = useMemo(() => {
    const base: Slot[] = [];
    const floor: Slot[] = [];
    const lip: Slot[] = [];
    const toy: Slot[] = [];
    const dome: Slot[] = [];
    for (const c of items) {
      const look = capsuleLook(c.id, c.color);
      base.push({ matrix: c.matrix, color: look.base });
      floor.push({ matrix: c.matrix.clone().multiply(LOCAL.floor), color: look.floor });
      lip.push({ matrix: c.matrix.clone().multiply(LOCAL.lip), color: look.base });
      toy.push({ matrix: c.matrix.clone().multiply(compose([0, r * 0.34, 0], look.toyTurn)), color: look.toy });
      dome.push({ matrix: c.matrix, color: look.dome });
    }
    return { base, floor, lip, toy, dome };
  }, [items]);

  return (
    <>
      <Batch slots={slots.base} geometry={kit.geometry.base} material={kit.material.base} />
      <Batch slots={slots.floor} geometry={kit.geometry.floor} material={kit.material.floor} shadow={false} />
      <Batch slots={slots.lip} geometry={kit.geometry.lip} material={kit.material.lip} shadow={false} />
      <Batch slots={slots.toy} geometry={kit.geometry.toy} material={kit.material.toy} shadow={false} />
      <Batch
        slots={slots.dome}
        geometry={kit.geometry.dome}
        material={kit.material.dome}
        shadow={false}
        receive={false}
        order={2}
      />
    </>
  );
}
