"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import type { TransactionInstruction } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { LAMPORTS, sol } from "../chain.store";
import { CHAIN, explorer } from "../config";
import { baseConnection } from "../connections";
import {
  fundVaultIx,
  initializeMachineIx,
  updateMachineIx,
  withdrawVaultIx,
} from "../instructions";
import { machinePda, vaultPda } from "../pdas";
import { machineConfigFromGame } from "../pile";
import { decodeMachine, type MachineAccount } from "../program";
import { sendBase } from "../send";
import { WalletButton } from "../ui/WalletButton";

const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, "0")).join("");

type Snapshot = { machine: MachineAccount | null; vault: number; gameRoot: string };

async function readSnapshot(): Promise<Snapshot> {
  const base = baseConnection();
  const [info, vault, config] = await Promise.all([
    base.getAccountInfo(machinePda()),
    base.getBalance(vaultPda()),
    machineConfigFromGame(0),
  ]);
  const machine = info?.owner.equals(CHAIN.programId) ? decodeMachine(info.data) : null;
  return { machine, vault, gameRoot: hex(config.pileRoot) };
}

/**
 * Setup page for the machine authority. The config it writes is derived from
 * the game's own constants (odds, lane, pile layout), so the program and the
 * 3D machine can't drift apart.
 */
export function AdminPanel() {
  const { publicKey, signTransaction } = useWallet();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [price, setPrice] = useState("0.002");
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState<{ text: string; url?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => setSnap(await readSnapshot());

  useEffect(() => {
    readSnapshot()
      .then(setSnap)
      .catch(() => setNote({ text: "Could not reach devnet. Reload to try again." }));
  }, []);

  const run = async (label: string, build: () => Promise<TransactionInstruction>) => {
    if (!publicKey || !signTransaction) return setNote({ text: "Connect a wallet first." });
    setBusy(true);
    setNote({ text: `${label}: approve in your wallet` });
    try {
      const signature = await sendBase({ publicKey, signTransaction }, [await build()]);
      setNote({ text: `${label}: done`, url: explorer.baseTx(signature) });
      await load();
    } catch (error) {
      setNote({ text: `${label} failed: ${error instanceof Error ? error.message : error}` });
    }
    setBusy(false);
  };

  const lamports = (value: string) => Math.round(Number(value) * LAMPORTS);
  const machine = snap?.machine ?? null;
  const isAuthority = !!(machine && publicKey && machine.authority.equals(publicKey));
  const stale = !!(machine && snap && hex(machine.config.pileRoot) !== snap.gameRoot);

  return (
    <main className="min-h-dvh bg-void p-6 text-paper md:p-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em]">Machine setup</h1>
          <WalletButton />
        </header>

        <dl className="panel grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-3xl p-6 text-sm">
          <Row label="Program" address={CHAIN.programId.toBase58()} />
          <Row label="Machine" address={machinePda().toBase58()} />
          <Row label="Prize pool" address={vaultPda().toBase58()} />
          <dt className="text-paper/55">Pool balance</dt>
          <dd className="text-right font-mono">{snap ? `${sol(snap.vault)} SOL` : "…"}</dd>
          <dt className="text-paper/55">State</dt>
          <dd className="text-right">
            {!snap ? "Checking" : machine ? "Initialized" : "Not initialized yet"}
          </dd>
          {machine && (
            <>
              <dt className="text-paper/55">Play price</dt>
              <dd className="text-right font-mono">
                {sol(machine.config.playPrice.toNumber())} SOL
              </dd>
              <dt className="text-paper/55">Rounds, paid out</dt>
              <dd className="text-right font-mono">
                {machine.roundsStarted.toString()}, {sol(machine.paidOut.toNumber())} SOL
              </dd>
              <dt className="text-paper/55">Pile</dt>
              <dd className="text-right">
                {machine.config.pileSize} prizes,{" "}
                {stale ? "root differs from this build: update config" : "root matches this build"}
              </dd>
            </>
          )}
        </dl>

        <section className="panel flex flex-col gap-4 rounded-3xl p-6">
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-paper/70">Play price (SOL per grab)</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              className="w-32 rounded-xl bg-paper/10 px-3 py-2 text-right font-mono"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            {!machine && (
              <Action
                disabled={busy}
                onClick={() =>
                  run("Initialize", async () =>
                    initializeMachineIx(
                      publicKey as NonNullable<typeof publicKey>,
                      await machineConfigFromGame(lamports(price)),
                    ),
                  )
                }
              >
                Initialize machine
              </Action>
            )}
            {machine && (
              <Action
                disabled={busy || !isAuthority}
                onClick={() =>
                  run("Update config", async () =>
                    updateMachineIx(
                      publicKey as NonNullable<typeof publicKey>,
                      await machineConfigFromGame(lamports(price)),
                    ),
                  )
                }
              >
                Update config from this build
              </Action>
            )}
          </div>
        </section>

        {machine && (
          <section className="panel flex flex-col gap-4 rounded-3xl p-6">
            <label className="flex items-center justify-between gap-4 text-sm">
              <span className="text-paper/70">Amount (SOL)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="w-32 rounded-xl bg-paper/10 px-3 py-2 text-right font-mono"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <Action
                disabled={busy}
                onClick={() =>
                  run("Fund", () =>
                    fundVaultIx(publicKey as NonNullable<typeof publicKey>, lamports(amount)),
                  )
                }
              >
                Fund prize pool
              </Action>
              <Action
                disabled={busy || !isAuthority}
                onClick={() =>
                  run("Withdraw", () =>
                    withdrawVaultIx(publicKey as NonNullable<typeof publicKey>, lamports(amount)),
                  )
                }
              >
                Withdraw
              </Action>
            </div>
            {!isAuthority && publicKey && (
              <p className="text-sm text-paper/55">
                Config and withdrawals need the authority wallet, {machine.authority.toBase58()}.
              </p>
            )}
          </section>
        )}

        {note && (
          <p className="text-sm text-paper/80" aria-live="polite">
            {note.text}{" "}
            {note.url && (
              <a href={note.url} target="_blank" rel="noreferrer" className="underline">
                View transaction
              </a>
            )}
          </p>
        )}
      </div>
    </main>
  );
}

function Row({ label, address }: { label: string; address: string }) {
  return (
    <>
      <dt className="text-paper/55">{label}</dt>
      <dd className="truncate text-right font-mono">
        <a href={explorer.address(address)} target="_blank" rel="noreferrer" className="underline">
          {address}
        </a>
      </dd>
    </>
  );
}

function Action(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="rounded-full bg-hot-pink px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40"
      {...props}
    />
  );
}
