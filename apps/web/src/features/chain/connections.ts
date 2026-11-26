import { Connection } from "@solana/web3.js";
import { CHAIN } from "./config";

let base: Connection | null = null;
let rollup: Connection | null = null;

/** Solana devnet. */
export function baseConnection() {
  base ??= new Connection(CHAIN.baseRpc, "confirmed");
  return base;
}

/** MagicBlock Ephemeral Rollup. Delegated accounts are read and written here. */
export function erConnection() {
  rollup ??= new Connection(CHAIN.erRpc, "confirmed");
  return rollup;
}
