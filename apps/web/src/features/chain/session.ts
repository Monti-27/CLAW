import {
  DELEGATION_PROGRAM_ID,
  GetCommitmentSignature,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { type Keypair, type PublicKey, SystemProgram } from "@solana/web3.js";
import { ODDS, type Target } from "@/features/round/odds";
import { type GripRoll, useGameStore } from "@/stores/game.store";
import { type RoundView, useChainStore } from "./chain.store";
import { CHAIN, explorer, ROLL_WAIT_MS } from "./config";
import { baseConnection, erConnection } from "./connections";
import {
  claimIx,
  delegateRoundIx,
  grabIx,
  moveClawIx,
  settleIx,
  startRoundIx,
} from "./instructions";
import { machinePda, roundPda, vaultPda } from "./pdas";
import { pileTree, prizeKind, toMm } from "./pile";
import { decodeMachine, decodeRound, type RoundAccount, roundStatus } from "./program";
import { type PlayerWallet, sendBase, sendRollup, sendRollupAsWallet, sleep, until } from "./send";
import { loadSessionKey, sessionKeyFor } from "./session-key";

/**
 * The onchain round, end to end:
 *
 *   openRound   base    start_round + delegate_round   one wallet approval
 *   pushMove    rollup  move_claw                       session key, gasless
 *   grab        rollup  move_claw + grab -> VRF         session key, gasless
 *   (callback)  rollup  grip_callback                   MagicBlock VRF
 *   closeRound  rollup  settle -> commit to Solana      session key
 *   claim       base    claim                           wallet
 *
 * The game keeps animating locally at 60fps; this module mirrors the claw to
 * the rollup and brings the roll back.
 */

type PendingGrab = {
  sentAt: number;
  /** round nonce before this grab; the result is the first resolved nonce above it */
  baseNonce: number;
  signature: string | null;
  roll: GripRoll | null;
  failed: boolean;
};

let player: PublicKey | null = null;
let wallet: PlayerWallet | null = null;
let sessionKey: Keypair | null = null;
let pending: PendingGrab | null = null;
let lastMove = { x: Number.NaN, z: Number.NaN };
let stopWatching: (() => void) | null = null;

const store = () => useChainStore.getState();

export const isLive = () => store().status === "live" && sessionKey !== null;

// ---------------------------------------------------------------- reading

type Seat = { delegated: boolean; account: RoundAccount | null };

/** The player's round, read from whichever layer currently owns it. */
async function readSeat(who: PublicKey): Promise<Seat | null> {
  const pda = roundPda(who);
  const onBase = await baseConnection().getAccountInfo(pda);
  if (!onBase) return null;
  if (onBase.owner.equals(CHAIN.programId)) {
    return { delegated: false, account: decodeRound(onBase.data) };
  }
  if (!onBase.owner.equals(DELEGATION_PROGRAM_ID)) return null;
  const onRollup = await erConnection().getAccountInfo(pda);
  const usable = onRollup?.owner.equals(CHAIN.programId) ? onRollup : null;
  return { delegated: true, account: usable ? decodeRound(usable.data) : null };
}

const toView = (round: RoundAccount, delegated: boolean): RoundView => ({
  status: roundStatus(round),
  delegated,
  credits: round.credits,
  payoutPending: round.payoutPending.toNumber(),
  plays: round.plays,
  wins: round.wins,
  nonce: round.nonce,
  resolvedNonce: round.resolvedNonce,
  needPpm: round.needPpm,
  rollPpm: round.rollPpm,
  won: round.won,
  moves: round.moves,
});

/** Looks up the machine and the player's round, and decides which mode the game is in. */
export async function refresh(who: PublicKey | null, { force = false } = {}) {
  if (!CHAIN.enabled) return store().set({ status: "off" });
  if (!who) {
    // wallet gone: drop the session here; the round itself is safe onchain and
    // is picked up or settled the next time this wallet presses Play
    stopWatching?.();
    player = null;
    wallet = null;
    sessionKey = null;
    pending = null;
    return store().set({ status: "no-wallet", round: null, busy: null });
  }
  const busy = ["opening", "live", "settling"].includes(store().status);
  if (busy && !force) return;
  player = who;

  try {
    const base = baseConnection();
    const [machineInfo, vaultLamports, seat] = await Promise.all([
      base.getAccountInfo(machinePda()),
      base.getBalance(vaultPda()),
      readSeat(who),
    ]);
    if (!machineInfo?.owner.equals(CHAIN.programId)) {
      return store().set({ status: "no-machine", machine: null, round: null, busy: null });
    }
    const machine = decodeMachine(machineInfo.data);
    store().set({
      status: "ready",
      busy: null,
      machine: {
        playPrice: machine.config.playPrice.toNumber(),
        vaultLamports,
        roundsStarted: machine.roundsStarted.toNumber(),
        paidOut: machine.paidOut.toNumber(),
      },
      round: seat?.account ? toView(seat.account, seat.delegated) : null,
    });
  } catch {
    // RPC hiccup: stay playable as a demo instead of blocking the title screen
    store().set({ status: "no-machine", busy: null });
  }
}

// ---------------------------------------------------------------- opening

/** Buys credits and moves the round to the rollup. Throws with a message fit for the UI. */
export async function openRound(w: PlayerWallet) {
  wallet = w;
  player = w.publicKey;
  const who = w.publicKey;
  store().set({ status: "opening", busy: "Checking your seat", error: null });

  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const seat = await readSeat(who);
      const key = loadSessionKey(who);
      const ours = !!(seat?.account && key && seat.account.sessionKey.equals(key.publicKey));

      if (seat?.delegated) {
        const round = seat.account;
        if (!round) {
          // delegated on Solana, not cloned on the rollup yet
          store().set({ busy: "Waiting for the rollup" });
          await sleep(2000);
          continue;
        }
        if (key && ours && roundStatus(round) === "aiming" && round.credits > 0) {
          return goLive(round, key); // credits left from before a reload: carry on
        }
        store().set({ busy: "Settling your last round" });
        await settle(who, ours ? key : null);
        continue;
      }

      if (seat?.account && roundStatus(seat.account) !== "closed") {
        // paid for but never delegated: finish the hand-off, then treat it as above
        store().set({ busy: "Approve in your wallet" });
        await sendBase(w, [await delegateRoundIx(who)]);
        await sleep(1500);
        continue;
      }

      const fresh = sessionKeyFor(who);
      const ixs = [
        await startRoundIx(who, CHAIN.creditsPerRound, fresh.publicKey),
        await delegateRoundIx(who),
      ];
      // first round with this key: make sure the account exists on Solana
      const funded = await baseConnection().getBalance(fresh.publicKey);
      if (CHAIN.sessionTopUp > 0 && funded < CHAIN.sessionTopUp) {
        ixs.unshift(
          SystemProgram.transfer({
            fromPubkey: who,
            toPubkey: fresh.publicKey,
            lamports: CHAIN.sessionTopUp - funded,
          }),
        );
      }
      store().set({ busy: "Approve in your wallet" });
      const signature = await sendBase(w, ixs);
      store().link("Round opened and delegated", explorer.baseTx(signature));

      store().set({ busy: "Moving your seat to the rollup" });
      const live = await until(
        async () => {
          const round = (await readSeat(who))?.account;
          const ready =
            round?.sessionKey.equals(fresh.publicKey) && roundStatus(round) === "aiming";
          return ready ? round : null;
        },
        { timeoutMs: 30_000, everyMs: 500 },
      );
      if (!live) throw new Error("The rollup has not picked up your round yet. Press Play again.");
      return goLive(live, fresh);
    }
    throw new Error("Could not open a round. Press Play to try again.");
  } catch (error) {
    await refresh(who, { force: true });
    store().set({ error: explain(error) });
    throw error;
  }
}

function goLive(round: RoundAccount, key: Keypair) {
  sessionKey = key;
  pending = null;
  lastMove = { x: round.clawX, z: round.clawZ };
  store().set({ status: "live", busy: null, round: toView(round, true), movesSent: 0 });
  watch();
}

// ---------------------------------------------------------------- playing

/** Mirrors the claw to the rollup. Called a few times a second while the player steers. */
export function pushMove(x: number, z: number) {
  const who = player;
  const key = sessionKey;
  if (!isLive() || pending || !who || !key) return;
  const xMm = toMm(x);
  const zMm = toMm(z);
  if (xMm === lastMove.x && zMm === lastMove.z) return;
  lastMove = { x: xMm, z: zMm };

  moveClawIx(key.publicKey, who, xMm, zMm)
    .then((ix) => sendRollup(key, [ix], { quiet: true }))
    .then(() => store().set({ movesSent: store().movesSent + 1 }))
    .catch(() => {
      // a dropped move is harmless: the grab carries the final position
    });
}

/**
 * Sends the grab. Returns the target the program will accept: it measures
 * reach in whole millimetres, so a prize right at the edge can fall outside.
 */
export function grab(x: number, z: number, target: Target | null): Target | null {
  const who = player;
  const key = sessionKey;
  if (!isLive() || !who || !key) return target;

  const xMm = toMm(x);
  const zMm = toMm(z);
  let accepted = target;
  if (target) {
    const dx = toMm(target.prize.position[0]) - xMm;
    const dz = toMm(target.prize.position[2]) - zMm;
    if (dx * dx + dz * dz > toMm(ODDS.reach) ** 2) accepted = null;
  }

  const grabbing: PendingGrab = {
    sentAt: performance.now(),
    baseNonce: store().round?.nonce ?? 0,
    signature: null,
    roll: null,
    failed: false,
  };
  pending = grabbing;
  lastMove = { x: xMm, z: zMm };

  (async () => {
    const leaf = accepted ? useGameStore.getState().pile.indexOf(accepted.prize) : -1;
    const tree = await pileTree();
    const proven =
      accepted && leaf >= 0
        ? {
            index: leaf,
            kind: prizeKind(accepted.prize),
            xMm: toMm(accepted.prize.position[0]),
            zMm: toMm(accepted.prize.position[2]),
            proof: tree.proof(leaf).map((node) => Array.from(node)),
          }
        : null;
    const seed = crypto.getRandomValues(new Uint8Array(32));
    // one transaction: pin the final position, then grab from it
    const signature = await sendRollup(key, [
      await moveClawIx(key.publicKey, who, xMm, zMm),
      await grabIx(key.publicKey, who, proven, seed),
    ]);
    grabbing.signature = signature;
    store().link("Grab and VRF request on the rollup", explorer.erTx(signature));
  })().catch((error) => {
    grabbing.failed = true;
    store().set({ error: explain(error) });
  });

  return accepted;
}

/** True while a grab is out and the claw should stay closed, waiting for its roll. */
export function waitingForRoll() {
  const g = pending;
  if (!g || g.roll || g.failed) return false;
  if (performance.now() - g.sentAt > ROLL_WAIT_MS) {
    g.failed = true;
    return false;
  }
  return true;
}

/** The VRF roll for the grab in flight, or null if the rollup never answered. */
export function takeRoll(): GripRoll | null {
  const roll = pending?.roll ?? null;
  pending = null;
  return roll;
}

function onRound(round: RoundAccount) {
  store().set({ round: toView(round, true) });
  const g = pending;
  if (!g || g.roll || round.nonce <= g.baseNonce || round.resolvedNonce !== round.nonce) return;

  const value = round.rollPpm / 1_000_000;
  const prizeValue = round.config.prizeValuesX100[round.targetKind] ?? 0;
  g.roll = {
    value,
    need: round.needPpm / 1_000_000,
    won: round.won,
    // same mapping the local roll uses, so the slip looks the same either way
    slipAt: 0.25 + ((value * 7.3) % 1) * 0.4,
    proof: {
      url: g.signature ? explorer.erTx(g.signature) : explorer.address(roundPda(round.player)),
      payoutLamports: round.won ? (prizeValue * round.config.playPrice.toNumber()) / 100 : 0,
    },
  };
}

/** Follows the round on the rollup: a subscription, plus polling as a safety net. */
function watch() {
  stopWatching?.();
  const who = player;
  if (!who) return;
  const pda = roundPda(who);
  const rollup = erConnection();
  let stopped = false;

  const apply = (data: Buffer) => {
    if (stopped) return;
    try {
      onRound(decodeRound(data));
    } catch {
      // not a round (mid-undelegation): ignore
    }
  };

  let subscription: number | null = null;
  try {
    subscription = rollup.onAccountChange(pda, (info) => apply(info.data), "confirmed");
  } catch {
    // no websocket: polling below covers it
  }

  (async () => {
    while (!stopped) {
      const info = await rollup.getAccountInfo(pda).catch(() => null);
      if (info?.owner.equals(CHAIN.programId)) apply(info.data);
      await sleep(pending && !pending.roll ? 250 : 2000);
    }
  })();

  stopWatching = () => {
    stopped = true;
    if (subscription !== null) void rollup.removeAccountChangeListener(subscription);
    stopWatching = null;
  };
}

// ---------------------------------------------------------------- closing

/** Commits the round to Solana and waits until it is back under the program there. */
async function settle(who: PublicKey, key: Keypair | null) {
  const signer = key?.publicKey ?? who;
  const ix = await settleIx(signer, who);
  let signature: string;
  if (key) signature = await sendRollup(key, [ix]);
  else if (wallet) signature = await sendRollupAsWallet(wallet, [ix]);
  else throw new Error("Connect the wallet that opened this round to settle it.");
  store().link("Round settled on the rollup", explorer.erTx(signature));

  // best effort: the matching commit on Solana, for the proof links
  GetCommitmentSignature(signature, erConnection())
    .then((commit) => store().link("Committed to Solana", explorer.baseTx(commit)))
    .catch(() => {});

  const back = await until(
    async () => {
      const info = await baseConnection().getAccountInfo(roundPda(who));
      return info?.owner.equals(CHAIN.programId) ? info : null;
    },
    { timeoutMs: 45_000, everyMs: 800 },
  );
  if (!back) throw new Error("Solana has not received the round yet. Try again in a few seconds.");
}

/** Leaving the machine: settle, refund unused credits, bring winnings to Solana. */
export async function closeRound() {
  const who = player;
  if (store().status !== "live" || !who) return;
  stopWatching?.();
  pending = null;
  store().set({ status: "settling", busy: "Settling on Solana", error: null });
  try {
    // a roll still in the air gets a moment to land, so its result is not lost
    await until(
      async () => {
        const round = (await readSeat(who))?.account;
        return !round || roundStatus(round) !== "rolling";
      },
      { timeoutMs: 8000, everyMs: 500 },
    );
    await settle(who, sessionKey);
    sessionKey = null;
  } catch (error) {
    store().set({ error: explain(error) });
  }
  await refresh(who, { force: true });
}

/** Pays out whatever the settled round is owed. */
export async function claim(w: PlayerWallet) {
  store().set({ busy: "Approve in your wallet", error: null });
  try {
    const signature = await sendBase(w, [await claimIx(w.publicKey, w.publicKey)]);
    store().link("Winnings paid out", explorer.baseTx(signature));
  } catch (error) {
    store().set({ error: explain(error) });
  }
  await refresh(w.publicKey, { force: true });
}

/** Turns wallet and RPC errors into one short line. */
function explain(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (/reject|denied|cancel/i.test(text)) return "Cancelled in the wallet.";
  if (/insufficient|0x1\b/i.test(text)) return "Not enough devnet SOL in this wallet.";
  if (/VaultEmpty/i.test(text)) return "The prize pool is empty right now. Try again later.";
  if (/RollPending/i.test(text)) return "A roll is still on its way. Try again in 20 seconds.";
  return text.split("\n")[0]?.slice(0, 140) ?? "Something went wrong.";
}
