import {
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  delegationMetadataPdaFromDelegatedAccount,
  delegationRecordPdaFromDelegatedAccount,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { PublicKey } from "@solana/web3.js";
import { CHAIN } from "./config";

const seed = (text: string) => new TextEncoder().encode(text);
const find = (seeds: Uint8Array[], program = CHAIN.programId) =>
  PublicKey.findProgramAddressSync(seeds, program)[0];

export const machinePda = () => find([seed("machine")]);
export const vaultPda = () => find([seed("vault"), machinePda().toBytes()]);
export const roundPda = (player: PublicKey) => find([seed("round"), player.toBytes()]);

/** Identity the VRF program signs callbacks with for this program. */
export const vrfIdentityPda = () => find([seed("identity")]);

/** Accounts the delegation program needs to take over a round. */
export function delegationPdas(round: PublicKey) {
  return {
    bufferRound: delegateBufferPdaFromDelegatedAccountAndOwnerProgram(round, CHAIN.programId),
    delegationRecordRound: delegationRecordPdaFromDelegatedAccount(round),
    delegationMetadataRound: delegationMetadataPdaFromDelegatedAccount(round),
  };
}
