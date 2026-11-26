"use client";

import { sol, useChainStore } from "../chain.store";
import { CHAIN } from "../config";

/**
 * The lines under the Play button: what a round costs, what is happening
 * right now, anything owed to the player, and links that prove it onchain.
 */
export function ChainNote({ onCollect }: { onCollect: () => void }) {
  const status = useChainStore((s) => s.status);
  const machine = useChainStore((s) => s.machine);
  const round = useChainStore((s) => s.round);
  const busy = useChainStore((s) => s.busy);
  const error = useChainStore((s) => s.error);
  const links = useChainStore((s) => s.links);
  if (status === "off") return null;

  const owed = round && !round.delegated && round.status === "closed" ? round.payoutPending : 0;
  const cost = machine ? sol(machine.playPrice * CHAIN.creditsPerRound) : null;

  return (
    <div className="pointer-events-auto flex max-w-[38ch] flex-col items-center gap-2 text-sm leading-snug text-paper/60 md:items-start">
      {busy ? (
        <p className="text-paper/85" aria-live="polite">
          {busy}
        </p>
      ) : status === "ready" && cost ? (
        <p>
          {CHAIN.creditsPerRound} grabs for {cost} SOL. One approval, then every move is gasless on
          the rollup.
        </p>
      ) : status === "no-wallet" ? (
        <p>Free demo. Connect a wallet to play for real on devnet.</p>
      ) : status === "no-machine" ? (
        <p>Free demo. The machine is not set up on this cluster yet.</p>
      ) : null}

      {error && <p className="text-[#ff8fa5]">{error}</p>}

      {owed > 0 && !busy && (
        <p className="flex items-center gap-3 text-paper/85">
          {sol(owed)} SOL is yours.
          <button
            type="button"
            onClick={onCollect}
            className="panel rounded-full px-4 py-1.5 font-semibold text-paper hover:brightness-125"
          >
            Collect
          </button>
        </p>
      )}

      {links.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 md:justify-start">
          {links.slice(0, 3).map((link) => (
            <li key={link.label}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-paper/30 underline-offset-4 hover:text-paper"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
