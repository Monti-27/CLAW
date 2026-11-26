/**
 * Merkle tree over the pile, byte-for-byte the same as `programs/claw/src/merkle.rs`.
 * Pure: no game imports, so it can be checked on its own.
 */

export type PileLeaf = { index: number; kind: number; xMm: number; zMm: number };

const sha256 = async (bytes: Uint8Array) =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource));

/** leaf = sha256(0x00 | index u16 | kind u8 | x i16 | z i16), little-endian. */
function hashLeaf(leaf: PileLeaf) {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, 0);
  view.setUint16(1, leaf.index, true);
  view.setUint8(3, leaf.kind);
  view.setInt16(4, leaf.xMm, true);
  view.setInt16(6, leaf.zMm, true);
  return sha256(bytes);
}

/** node = sha256(0x01 | left | right); an odd node pairs with itself. */
function hashNode(left: Uint8Array, right: Uint8Array) {
  const bytes = new Uint8Array(65);
  bytes[0] = 1;
  bytes.set(left, 1);
  bytes.set(right, 33);
  return sha256(bytes);
}

export type PileTree = {
  leaves: PileLeaf[];
  root: Uint8Array;
  proof: (index: number) => Uint8Array[];
};

export async function buildTree(leaves: PileLeaf[]): Promise<PileTree> {
  const levels: Uint8Array[][] = [await Promise.all(leaves.map(hashLeaf))];
  while ((levels.at(-1) as Uint8Array[]).length > 1) {
    const prev = levels.at(-1) as Uint8Array[];
    const next: Promise<Uint8Array>[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      next.push(hashNode(prev[i] as Uint8Array, prev[i + 1] ?? (prev[i] as Uint8Array)));
    }
    levels.push(await Promise.all(next));
  }

  return {
    leaves,
    root: (levels.at(-1) as Uint8Array[])[0] as Uint8Array,
    proof: (index) => {
      const path: Uint8Array[] = [];
      let i = index;
      for (const level of levels.slice(0, -1)) {
        path.push(level[i ^ 1] ?? (level[i] as Uint8Array));
        i >>= 1;
      }
      return path;
    },
  };
}
