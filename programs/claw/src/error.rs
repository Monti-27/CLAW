use anchor_lang::prelude::*;

#[error_code]
pub enum ClawError {
    #[msg("Machine config is out of range")]
    InvalidConfig,
    #[msg("Only the machine authority can do this")]
    NotAuthority,
    #[msg("Buy between 1 and the machine's max credits")]
    InvalidCredits,
    #[msg("A round is already open; settle it first")]
    RoundActive,
    #[msg("This round is not open for play")]
    RoundNotOpen,
    #[msg("Signer is neither the player nor the round's session key")]
    NotAuthorized,
    #[msg("Claw position is outside the playfield")]
    OutOfBounds,
    #[msg("No credits left; start a new round")]
    NoCredits,
    #[msg("A grip roll is still pending")]
    RollPending,
    #[msg("Prize is not part of this machine's pile")]
    InvalidPrizeProof,
    #[msg("Unknown prize kind")]
    InvalidPrizeKind,
    #[msg("Round must be delegated to the machine's validator")]
    WrongValidator,
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Vault cannot cover this payout yet")]
    VaultEmpty,
    #[msg("Math overflow")]
    Overflow,
}
