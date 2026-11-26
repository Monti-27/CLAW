import { PublicKey } from "@solana/web3.js";
import idl from "./idl/claw.json";

/**
 * Where the game talks to. Everything has a devnet default, so the app runs
 * with no .env at all; override with NEXT_PUBLIC_* to point somewhere else.
 */
const env = {
  programId: process.env.NEXT_PUBLIC_CLAW_PROGRAM_ID,
  baseRpc: process.env.NEXT_PUBLIC_SOLANA_RPC,
  erRpc: process.env.NEXT_PUBLIC_ER_RPC,
  erValidator: process.env.NEXT_PUBLIC_ER_VALIDATOR,
  chain: process.env.NEXT_PUBLIC_CLAW_CHAIN,
  credits: process.env.NEXT_PUBLIC_CLAW_CREDITS,
  sessionTopUp: process.env.NEXT_PUBLIC_CLAW_SESSION_TOPUP,
};

export const CHAIN = {
  /** "off" forces the local demo even with a wallet connected */
  enabled: env.chain !== "off",
  programId: new PublicKey(env.programId || idl.address),
  /** Solana devnet: machine, vault, buying credits, payouts */
  baseRpc: env.baseRpc || "https://api.devnet.solana.com",
  /** MagicBlock Ephemeral Rollup (Asia): claw moves, grabs, VRF rolls */
  erRpc: env.erRpc || "https://devnet-as.magicblock.app/",
  erValidator: new PublicKey(env.erValidator || "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57"),
  /** grabs bought per round with one wallet approval */
  creditsPerRound: Math.min(10, Math.max(1, Number(env.credits) || 3)),
  /**
   * Lamports sent once to a new session key so it exists on Solana before it
   * signs on the rollup. Rollup fees are zero, so this is never spent. 0 = skip.
   */
  sessionTopUp: env.sessionTopUp === undefined ? 1_000_000 : Number(env.sessionTopUp) || 0,
} as const;

/** MagicBlock VRF: the queue that lives on the rollup, and the program behind it. */
export const VRF = {
  program: new PublicKey("Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"),
  ephemeralQueue: new PublicKey("5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc"),
  slotHashes: new PublicKey("SysvarS1otHashes111111111111111111111111111"),
} as const;

/** How long the game waits for a VRF callback before it stops holding the claw. */
export const ROLL_WAIT_MS = 12_000;
/** How often the claw position is pushed to the rollup while it moves. */
export const MOVE_INTERVAL_MS = 120;

const EXPLORER = "https://explorer.solana.com";
const erCluster = `cluster=custom&customUrl=${encodeURIComponent(CHAIN.erRpc)}`;

export const explorer = {
  baseTx: (signature: string) => `${EXPLORER}/tx/${signature}?cluster=devnet`,
  erTx: (signature: string) => `${EXPLORER}/tx/${signature}?${erCluster}`,
  address: (address: PublicKey | string) =>
    `${EXPLORER}/address/${address.toString()}?cluster=devnet`,
};
