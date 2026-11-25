use anchor_lang::prelude::*;

#[constant]
pub const MACHINE_SEED: &[u8] = b"machine";
#[constant]
pub const VAULT_SEED: &[u8] = b"vault";
#[constant]
pub const ROUND_SEED: &[u8] = b"round";

/// Fixed-point scale for probabilities: 1_000_000 = certain.
pub const PPM: u64 = 1_000_000;
/// Basis-point scale for the payout ratio and the demo boost.
pub const BPS: u64 = 10_000;
/// How much a grab at the very edge of reach loses: hold * (1 - 0.6 * (d / reach)^2).
pub const ALIGNMENT_FALLOFF_PPM: u64 = 600_000;

/// Prize kinds, in the order of `MachineConfig::prize_values_x100`.
pub const PRIZE_KINDS: usize = 7;
/// Marks "the claw closed on nothing".
pub const NO_TARGET: u8 = u8::MAX;

/// Deepest Merkle proof accepted for a prize (2^12 = 4096 prizes).
pub const MAX_PROOF_DEPTH: usize = 12;
/// Seconds after which an unanswered randomness request can be retried or abandoned.
pub const ROLL_TIMEOUT_SECS: i64 = 20;
