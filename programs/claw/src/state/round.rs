use anchor_lang::prelude::*;

use crate::{
    constants::{NO_TARGET, ROLL_TIMEOUT_SECS},
    error::ClawError,
    state::MachineConfig,
};

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RoundStatus {
    /// Settled (or never started). Lives on the base layer.
    Closed,
    /// Delegated and steerable.
    Aiming,
    /// Grab sent, waiting for the VRF callback.
    Rolling,
}

/// One player's seat at the machine. Created and paid for on the base layer,
/// delegated to the Ephemeral Rollup for play, committed back on settle.
#[account]
#[derive(InitSpace)]
pub struct Round {
    pub player: Pubkey,
    /// Temporary key allowed to steer and grab for this round (default = none).
    pub session_key: Pubkey,
    pub machine: Pubkey,
    /// Machine config at the moment the round started.
    pub config: MachineConfig,
    pub status: RoundStatus,
    pub credits: u8,

    /// Claw position in millimetres.
    pub claw_x: i16,
    pub claw_z: i16,
    pub moves: u32,

    /// Counts grabs; ties each VRF callback to exactly one request.
    pub nonce: u32,
    /// Nonce of the last grab that has a result.
    pub resolved_nonce: u32,
    pub requested_at: i64,

    /// Last grab: what the claw closed on and how it went.
    pub target_index: u16,
    pub target_kind: u8,
    pub distance_mm: u16,
    pub need_ppm: u32,
    pub roll_ppm: u32,
    pub won: bool,
    pub randomness: [u8; 32],

    /// Lamports owed to the player, paid by `claim` on the base layer.
    pub payout_pending: u64,
    pub plays: u32,
    pub wins: u32,
    pub total_won: u64,
    pub bump: u8,
}

impl Round {
    pub fn authorize(&self, signer: &Pubkey) -> Result<()> {
        let session = self.session_key != Pubkey::default() && *signer == self.session_key;
        require!(*signer == self.player || session, ClawError::NotAuthorized);
        Ok(())
    }

    /// A roll was requested and the oracle has gone quiet for too long.
    pub fn roll_timed_out(&self, now: i64) -> bool {
        self.status == RoundStatus::Rolling
            && now.saturating_sub(self.requested_at) >= ROLL_TIMEOUT_SECS
    }

    pub fn clear_grab(&mut self) {
        self.target_index = 0;
        self.target_kind = NO_TARGET;
        self.distance_mm = 0;
        self.need_ppm = 0;
        self.roll_ppm = 0;
        self.won = false;
        self.randomness = [0; 32];
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::Machine;

    /// The web client allocates and decodes by these sizes (see the generated IDL).
    #[test]
    fn account_sizes_are_stable() {
        assert_eq!(8 + Round::INIT_SPACE, 336);
        assert_eq!(8 + Machine::INIT_SPACE, 201);
    }
}
