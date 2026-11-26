"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import type { ReactNode } from "react";
import { CHAIN } from "./config";

// Phantom, Solflare, Backpack and friends announce themselves through the
// Wallet Standard, so no adapter list is needed.
const WALLETS: never[] = [];

/** Wallet + base-layer connection for the whole app. */
export function ChainProviders({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={CHAIN.baseRpc}>
      <WalletProvider wallets={WALLETS} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
