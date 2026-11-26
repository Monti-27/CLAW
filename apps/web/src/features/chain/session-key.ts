import { Keypair, type PublicKey } from "@solana/web3.js";

/**
 * A key that lives in this browser and plays on the player's behalf. The
 * wallet registers it in `start_round`; after that it can steer, grab and
 * settle, so the wallet is asked once per round instead of on every move.
 * It can never move funds: payouts only go to the player's own wallet.
 * One key per wallet, kept in localStorage so a reload can pick a round back up.
 */
const slot = (player: PublicKey) => `claw:session:${player.toBase58()}`;

export function loadSessionKey(player: PublicKey) {
  try {
    const raw = localStorage.getItem(slot(player));
    return raw ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[])) : null;
  } catch {
    return null;
  }
}

export function sessionKeyFor(player: PublicKey) {
  const existing = loadSessionKey(player);
  if (existing) return existing;
  const key = Keypair.generate();
  try {
    localStorage.setItem(slot(player), JSON.stringify(Array.from(key.secretKey)));
  } catch {
    // storage blocked: the key still works for this page load
  }
  return key;
}
