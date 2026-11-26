import { BN } from "@anchor-lang/core";
import {
  DELEGATION_PROGRAM_ID,
  MAGIC_CONTEXT_ID,
  MAGIC_PROGRAM_ID,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { type PublicKey, SystemProgram } from "@solana/web3.js";
import { CHAIN, VRF } from "./config";
import { delegationPdas, machinePda, roundPda, vaultPda, vrfIdentityPda } from "./pdas";
import { type GrabTarget, type MachineConfig, program } from "./program";

/**
 * One builder per program instruction. Each returns a plain
 * TransactionInstruction; the comment says which layer it must be sent to.
 */

const systemProgram = SystemProgram.programId;

// ---- machine: base layer, authority ----

export const initializeMachineIx = (authority: PublicKey, config: MachineConfig) =>
  program()
    .methods.initializeMachine(config)
    .accountsStrict({ authority, machine: machinePda(), vault: vaultPda(), systemProgram })
    .instruction();

export const updateMachineIx = (authority: PublicKey, config: MachineConfig) =>
  program()
    .methods.updateMachine(config)
    .accountsStrict({ authority, machine: machinePda() })
    .instruction();

export const fundVaultIx = (funder: PublicKey, lamports: number) =>
  program()
    .methods.fundVault(new BN(lamports))
    .accountsStrict({ funder, machine: machinePda(), vault: vaultPda(), systemProgram })
    .instruction();

export const withdrawVaultIx = (authority: PublicKey, lamports: number) =>
  program()
    .methods.withdrawVault(new BN(lamports))
    .accountsStrict({ authority, machine: machinePda(), vault: vaultPda(), systemProgram })
    .instruction();

// ---- round setup: base layer, player wallet ----

export const startRoundIx = (player: PublicKey, credits: number, sessionKey: PublicKey) =>
  program()
    .methods.startRound(credits, sessionKey)
    .accountsStrict({
      player,
      machine: machinePda(),
      vault: vaultPda(),
      round: roundPda(player),
      systemProgram,
    })
    .instruction();

export function delegateRoundIx(player: PublicKey) {
  const round = roundPda(player);
  return program()
    .methods.delegateRound()
    .accountsStrict({
      player,
      machine: machinePda(),
      round,
      ...delegationPdas(round),
      validator: CHAIN.erValidator,
      ownerProgram: CHAIN.programId,
      delegationProgram: DELEGATION_PROGRAM_ID,
      systemProgram,
    })
    .instruction();
}

// ---- play: Ephemeral Rollup, player wallet or session key ----

export const moveClawIx = (signer: PublicKey, player: PublicKey, xMm: number, zMm: number) =>
  program()
    .methods.moveClaw(xMm, zMm)
    .accountsStrict({ signer, round: roundPda(player) })
    .instruction();

export const grabIx = (
  signer: PublicKey,
  player: PublicKey,
  target: GrabTarget | null,
  clientSeed: Uint8Array,
) =>
  program()
    .methods.grab(target, Array.from(clientSeed))
    .accountsStrict({
      signer,
      round: roundPda(player),
      oracleQueue: VRF.ephemeralQueue,
      programIdentity: vrfIdentityPda(),
      vrfProgram: VRF.program,
      slotHashes: VRF.slotHashes,
      systemProgram,
    })
    .instruction();

export const settleIx = (signer: PublicKey, player: PublicKey) =>
  program()
    .methods.settle()
    .accountsStrict({
      signer,
      round: roundPda(player),
      magicProgram: MAGIC_PROGRAM_ID,
      magicContext: MAGIC_CONTEXT_ID,
    })
    .instruction();

// ---- payout: base layer, anyone ----

export const claimIx = (payer: PublicKey, player: PublicKey) =>
  program()
    .methods.claim()
    .accountsStrict({
      payer,
      player,
      machine: machinePda(),
      vault: vaultPda(),
      round: roundPda(player),
      systemProgram,
    })
    .instruction();
