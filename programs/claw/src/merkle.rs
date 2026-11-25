//! The pile is committed onchain as a Merkle root, so a grab can prove
//! "this prize sits at this spot" without the program storing every prize.

use solana_sha256_hasher::hashv;

/// leaf = sha256(0x00 | index | kind | x | z), integers little-endian.
pub fn leaf(index: u16, kind: u8, x_mm: i16, z_mm: i16) -> [u8; 32] {
    hashv(&[
        &[0u8],
        &index.to_le_bytes(),
        &[kind],
        &x_mm.to_le_bytes(),
        &z_mm.to_le_bytes(),
    ])
    .to_bytes()
}

/// node = sha256(0x01 | left | right). An odd node at the end of a level is
/// paired with itself, so `index` alone decides the side at every step.
pub fn verify(root: &[u8; 32], leaf: [u8; 32], index: u16, proof: &[[u8; 32]]) -> bool {
    let mut node = leaf;
    let mut position = index as u32;
    for sibling in proof {
        node = if position & 1 == 0 {
            hashv(&[&[1u8], &node, sibling]).to_bytes()
        } else {
            hashv(&[&[1u8], sibling, &node]).to_bytes()
        };
        position >>= 1;
    }
    position == 0 && node == *root
}

#[cfg(test)]
mod tests {
    use super::*;

    fn build(leaves: &[[u8; 32]]) -> Vec<Vec<[u8; 32]>> {
        let mut levels = vec![leaves.to_vec()];
        while levels.last().unwrap().len() > 1 {
            let prev = levels.last().unwrap();
            let next = prev
                .chunks(2)
                .map(|pair| {
                    let right = pair.get(1).unwrap_or(&pair[0]);
                    hashv(&[&[1u8], &pair[0], right]).to_bytes()
                })
                .collect();
            levels.push(next);
        }
        levels
    }

    fn proof(levels: &[Vec<[u8; 32]>], mut index: usize) -> Vec<[u8; 32]> {
        let mut out = vec![];
        for level in &levels[..levels.len() - 1] {
            let sibling = index ^ 1;
            out.push(*level.get(sibling).unwrap_or(&level[index]));
            index >>= 1;
        }
        out
    }

    #[test]
    fn every_leaf_of_an_odd_tree_verifies() {
        let leaves: Vec<_> = (0..11u16)
            .map(|i| leaf(i, (i % 7) as u8, -100 - i as i16, 20))
            .collect();
        let levels = build(&leaves);
        let root = levels.last().unwrap()[0];
        for i in 0..leaves.len() {
            assert!(
                verify(&root, leaves[i], i as u16, &proof(&levels, i)),
                "leaf {i}"
            );
        }
    }

    #[test]
    fn a_moved_or_relabelled_prize_fails() {
        let leaves: Vec<_> = (0..8u16).map(|i| leaf(i, 4, i as i16, 0)).collect();
        let levels = build(&leaves);
        let root = levels.last().unwrap()[0];
        let p = proof(&levels, 3);
        assert!(verify(&root, leaf(3, 4, 3, 0), 3, &p));
        assert!(!verify(&root, leaf(3, 0, 3, 0), 3, &p)); // claims a better prize
        assert!(!verify(&root, leaf(3, 4, 4, 0), 3, &p)); // claims a closer spot
        assert!(!verify(&root, leaf(3, 4, 3, 0), 2, &p)); // wrong slot
        assert!(!verify(&root, leaf(3, 4, 3, 0), 3, &p[..2])); // short proof
    }

    fn unhex(s: &str) -> [u8; 32] {
        let mut out = [0u8; 32];
        for (i, byte) in out.iter_mut().enumerate() {
            *byte = u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).unwrap();
        }
        out
    }

    /// Root and proofs produced by the web client (`apps/web/src/features/chain/merkle.ts`)
    /// for the same eleven leaves. If this fails, the two implementations have drifted.
    #[test]
    fn matches_the_web_client() {
        const ROOT: &str = "1cc1c297e0a9a807d38a6cc8baf2ffc7657b5f2bfae1bddeb497db720069b98f";
        const PROOF_3: &str = "2cba1acee6ce806b203b617ba77eda32f80a94af73cef728a9b92fcee7dba404,f04cf51ca87b67dcf4e65faae58eb7f2ec9761321ef25bf0ff823b00b2e03beb,9a7838e9454abfc52c3f959ba9ac9c157b8a0a51c0faa42708aa03cb14db7a3f,65a7d4c84392de50375da2215628c4f23aa581492324662adef8755fa1ffc867";
        const PROOF_10: &str = "bf1db529a067bbbf0b05a7b66fe5b1813b1c75351807b82884ed4f648477768d,fd5d6f8e338a4620b7e6278ecb938253b9a6faf1b93c721ad3080dfa2706129f,03978950867079b26a346d3f1f471bae4d12ec47e09dfa768ba63d0b4df8788d,b7d501793ef8d1f229d19b96870b146ba3a0b5126a7acb03a7b87cf4cc4b56a0";

        let leaves: Vec<_> = (0..11u16)
            .map(|i| leaf(i, (i % 7) as u8, -100 - i as i16, 20))
            .collect();
        let levels = build(&leaves);
        assert_eq!(levels.last().unwrap()[0], unhex(ROOT));

        let p3: Vec<_> = PROOF_3.split(',').map(unhex).collect();
        let p10: Vec<_> = PROOF_10.split(',').map(unhex).collect();
        assert!(verify(&unhex(ROOT), leaves[3], 3, &p3));
        assert!(verify(&unhex(ROOT), leaves[10], 10, &p10));
        assert!(!verify(&unhex(ROOT), leaves[10], 3, &p10));
    }
}
