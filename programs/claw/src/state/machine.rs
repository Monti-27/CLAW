use anchor_lang::prelude::*;

use crate::{constants::*, error::ClawError};

/// Everything a round needs to price a grab. Copied onto the round when it
/// starts, so play on the rollup never depends on a second account.
#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Clone, Copy, Debug, PartialEq, Eq)]
pub struct MachineConfig {
    /// Lamports per credit.
    pub play_price: u64,
    /// Share of the play price returned on average, in basis points.
    pub payout_ratio_bps: u16,
    /// Demo multiplier on the hold chance, in basis points (10_000 = none).
    pub boost_bps: u32,
    /// Highest hold chance any prize can have.
    pub cap_ppm: u32,
    /// Lowest hold chance for a prize within reach.
    pub floor_ppm: u32,
    /// Horizontal reach of the claw, in millimetres.
    pub reach_mm: u16,
    /// Player lane, in millimetres from the cabinet centre.
    pub min_x: i16,
    pub max_x: i16,
    pub min_z: i16,
    pub max_z: i16,
    /// Where the claw parks (above the chute).
    pub home_x: i16,
    pub home_z: i16,
    /// Prize value per kind, in hundredths of a play price.
    pub prize_values_x100: [u32; PRIZE_KINDS],
    /// Merkle root over every prize in the pile: (index, kind, x, z).
    pub pile_root: [u8; 32],
    /// Seed the clients build the same pile from.
    pub pile_seed: u32,
    pub pile_size: u16,
    /// Most credits one round can hold.
    pub max_credits: u8,
    /// Rollup validator rounds must be delegated to (default = any).
    pub validator: Pubkey,
}

impl MachineConfig {
    pub fn validate(&self) -> Result<()> {
        let ok = self.play_price > 0
            && self.payout_ratio_bps as u64 <= BPS
            && self.boost_bps > 0
            && self.cap_ppm as u64 <= PPM
            && self.floor_ppm <= self.cap_ppm
            && self.reach_mm > 0
            && self.min_x < self.max_x
            && self.min_z < self.max_z
            && self.in_bounds(self.home_x, self.home_z)
            && self.prize_values_x100.iter().all(|v| *v > 0)
            && self.pile_size > 0
            && self.max_credits > 0;
        require!(ok, ClawError::InvalidConfig);
        Ok(())
    }

    pub fn in_bounds(&self, x: i16, z: i16) -> bool {
        x >= self.min_x && x <= self.max_x && z >= self.min_z && z <= self.max_z
    }
}

#[account]
#[derive(InitSpace)]
pub struct Machine {
    pub authority: Pubkey,
    pub config: MachineConfig,
    /// Lifetime counters, updated on the base layer.
    pub rounds_started: u64,
    pub credits_sold: u64,
    pub paid_out: u64,
    pub bump: u8,
    pub vault_bump: u8,
}
