import { create } from "zustand";

/**
 * off          chain play disabled by env
 * checking     looking up the machine and the player's round
 * no-wallet    nothing connected: the game runs as a local demo
 * no-machine   program not deployed or machine not initialized on this cluster
 * ready        wallet connected, machine found: Play opens a round onchain
 * opening      buying credits and delegating the round to the rollup
 * live         round is on the Ephemeral Rollup; moves and grabs go there
 * settling     committing the round back to Solana
 */
export type ChainStatus =
  | "off"
  | "checking"
  | "no-wallet"
  | "no-machine"
  | "ready"
  | "opening"
  | "live"
  | "settling";

export type MachineView = {
  playPrice: number;
  vaultLamports: number;
  roundsStarted: number;
  paidOut: number;
};

export type RoundView = {
  status: "closed" | "aiming" | "rolling";
  delegated: boolean;
  credits: number;
  payoutPending: number;
  plays: number;
  wins: number;
  nonce: number;
  resolvedNonce: number;
  needPpm: number;
  rollPpm: number;
  won: boolean;
  moves: number;
};

/** A transaction worth showing: proof that something happened onchain. */
export type ChainLink = { label: string; url: string };

type ChainStore = {
  status: ChainStatus;
  machine: MachineView | null;
  round: RoundView | null;
  /** what is in flight, in words, for the button and the status line */
  busy: string | null;
  error: string | null;
  links: ChainLink[];
  /** claw moves sent to the rollup this round */
  movesSent: number;
  /** the paid grabs of this round are used up; the game goes back to the title */
  outOfGrabs: boolean;

  set: (next: Partial<Omit<ChainStore, "set" | "link">>) => void;
  link: (label: string, url: string) => void;
};

export const useChainStore = create<ChainStore>()((set) => ({
  status: "checking",
  machine: null,
  round: null,
  busy: null,
  error: null,
  links: [],
  movesSent: 0,
  outOfGrabs: false,

  set: (next) => set(next),
  link: (label, url) =>
    set((s) => ({
      links: [{ label, url }, ...s.links.filter((l) => l.label !== label)].slice(0, 5),
    })),
}));

export const LAMPORTS = 1_000_000_000;
export const sol = (lamports: number) =>
  (lamports / LAMPORTS).toLocaleString("en-US", { maximumFractionDigits: 4 });
