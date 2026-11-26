"use client";

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { PourButton } from "@/features/play/ui/LiquidButton";

const short = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;

/** Connect, show, disconnect. Lists the wallets the browser actually has. */
/** `segment`: drawn as the game's liquid capsule (header), rather than a plain pill. */
export function WalletButton({ segment = false }: { segment?: boolean } = {}) {
  const { wallets, publicKey, select, disconnect, connecting } = useWallet();
  const [open, setOpen] = useState(false);
  const installed = wallets.filter((w) => w.readyState === WalletReadyState.Installed);

  return (
    <div className="pointer-events-auto relative">
      {segment ? (
        <PourButton
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          icon={
            publicKey ? (
              <span className="size-1.5 rounded-full bg-[#69f0c4] shadow-[0_0_6px_#69f0c4]" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" className="size-4 opacity-80" fill="none" aria-hidden="true">
                <path
                  d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17a1 1 0 0 1 1 1v1.5M4 7.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.5a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 1 4 7.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <circle cx="16" cy="13.25" r="1.25" fill="currentColor" />
              </svg>
            )
          }
        >
          {publicKey ? (
            <span className="font-mono text-[12.5px]">{short(publicKey.toBase58())}</span>
          ) : connecting ? (
            "Connecting"
          ) : (
            "Connect wallet"
          )}
        </PourButton>
      ) : (
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="panel flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-paper/90 hover:text-paper"
      >
        {publicKey && <span className="size-2 rounded-full bg-[#69f0c4]" aria-hidden="true" />}
        {publicKey ? (
          <span className="font-mono text-[13px]">{short(publicKey.toBase58())}</span>
        ) : connecting ? (
          "Connecting"
        ) : (
          "Connect wallet"
        )}
      </button>
      )}

      {open && (
        <div className="panel absolute top-12 right-0 z-10 w-60 rounded-2xl p-2 text-sm">
          {publicKey ? (
            <button
              type="button"
              className="w-full rounded-xl px-3 py-2.5 text-left text-paper/85 hover:bg-paper/10 hover:text-paper"
              onClick={() => {
                setOpen(false);
                void disconnect();
              }}
            >
              Disconnect
            </button>
          ) : installed.length > 0 ? (
            installed.map((w) => (
              <button
                key={w.adapter.name}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-paper/85 hover:bg-paper/10 hover:text-paper"
                onClick={() => {
                  setOpen(false);
                  select(w.adapter.name);
                }}
              >
                <span
                  className="size-6 rounded-md bg-cover bg-center"
                  style={{ backgroundImage: `url("${w.adapter.icon}")` }}
                  aria-hidden="true"
                />
                {w.adapter.name}
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 leading-snug text-paper/70">
              No Solana wallet found in this browser. Install Phantom or Solflare, set it to devnet,
              then reload.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
