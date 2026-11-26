import { type IdlAccounts, type IdlTypes, Program } from "@anchor-lang/core";
import type { Connection } from "@solana/web3.js";
import { baseConnection } from "./connections";
import type { Claw } from "./idl/claw";
import idl from "./idl/claw.json";

export type MachineAccount = IdlAccounts<Claw>["machine"];
export type RoundAccount = IdlAccounts<Claw>["round"];
export type MachineConfig = IdlTypes<Claw>["machineConfig"];
export type GrabTarget = IdlTypes<Claw>["grabTarget"];

export type RoundStatus = "closed" | "aiming" | "rolling";

let cached: Program<Claw> | null = null;

/**
 * Typed client. It only builds instructions and decodes accounts, so one
 * instance serves both layers; where a transaction goes is decided on send.
 */
export function program(connection: Connection = baseConnection()): Program<Claw> {
  cached ??= new Program<Claw>(idl as Claw, { connection });
  return cached;
}

export const decodeRound = (data: Buffer): RoundAccount =>
  program().coder.accounts.decode<RoundAccount>("round", data);

export const decodeMachine = (data: Buffer): MachineAccount =>
  program().coder.accounts.decode<MachineAccount>("machine", data);

export const roundStatus = (round: RoundAccount): RoundStatus =>
  Object.keys(round.status)[0] as RoundStatus;
