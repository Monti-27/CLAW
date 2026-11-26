import {
  type Keypair,
  type PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { baseConnection, erConnection } from "./connections";

/** The slice of a wallet adapter the game needs. */
export type PlayerWallet = {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
};

/** Base layer: wallet signs, we wait until Solana confirms. */
export async function sendBase(wallet: PlayerWallet, ixs: TransactionInstruction[]) {
  const connection = baseConnection();
  const latest = await connection.getLatestBlockhash();
  const tx = new Transaction({ feePayer: wallet.publicKey, ...latest }).add(...ixs);
  const signed = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize());
  const result = await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  if (result.value.err) throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
  return signature;
}

// Rollup blockhashes go stale fast, and steering sends many transactions a
// second, so one is shared for a short moment instead of fetched per move.
let cachedHash: { blockhash: string; at: number } | null = null;

async function rollupBlockhash() {
  if (!cachedHash || performance.now() - cachedHash.at > 800) {
    const { blockhash } = await erConnection().getLatestBlockhash();
    cachedHash = { blockhash, at: performance.now() };
  }
  return cachedHash.blockhash;
}

/**
 * Ephemeral Rollup, signed by the round's session key. Fees there are zero,
 * so the key needs no SOL. `quiet` skips the execution check: right for claw
 * moves, where the next one replaces a lost one anyway.
 */
export async function sendRollup(
  signer: Keypair,
  ixs: TransactionInstruction[],
  { quiet = false } = {},
) {
  const tx = new Transaction({
    feePayer: signer.publicKey,
    recentBlockhash: await rollupBlockhash(),
  }).add(...ixs);
  tx.sign(signer);
  return erConnection().sendRawTransaction(tx.serialize(), { skipPreflight: quiet });
}

/** Ephemeral Rollup, signed by the wallet. Only needed when the session key is gone. */
export async function sendRollupAsWallet(wallet: PlayerWallet, ixs: TransactionInstruction[]) {
  const { blockhash } = await erConnection().getLatestBlockhash();
  const tx = new Transaction({ feePayer: wallet.publicKey, recentBlockhash: blockhash }).add(
    ...ixs,
  );
  const signed = await wallet.signTransaction(tx);
  return erConnection().sendRawTransaction(signed.serialize());
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls `check` until it returns something, or gives up. */
export async function until<T>(
  check: () => Promise<T | null | undefined>,
  { timeoutMs, everyMs = 400 }: { timeoutMs: number; everyMs?: number },
): Promise<T | null> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    const value = await check().catch(() => null);
    if (value) return value;
    await sleep(everyMs);
  }
  return null;
}
