use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::{anchor::vrf_callback, vrf::consts::scoped_vrf_identity_const};

use crate::{constants::*, error::ClawError, odds, state::*};

#[event]
pub struct GripResolved {
    pub player: Pubkey,
    pub nonce: u32,
    pub target_kind: u8,
    pub need_ppm: u32,
    pub roll_ppm: u32,
    pub won: bool,
    pub payout: u64,
}

/// The VRF identity PDA scoped to this program, worked out at compile time.
/// It has to be a `const` item: left inline in the account constraint, the
/// derivation runs onchain on every callback and burns the whole compute budget.
const VRF_IDENTITY: Pubkey = Pubkey::new_from_array(scoped_vrf_identity_const(&crate::ID).0);

/// Only MagicBlock's VRF program, answering a request this program made, can
/// sign as `vrf_program_identity`, so nobody else gets in.
#[vrf_callback]
#[derive(Accounts)]
pub struct GripCallback<'info> {
    #[account(address = VRF_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(mut, seeds = [ROUND_SEED, round.player.as_ref()], bump = round.bump)]
    pub round: Box<Account<'info, Round>>,
}

/// Ephemeral Rollup. The roll lands here: below the threshold the claw holds.
pub fn handle_grip_callback(
    ctx: Context<GripCallback>,
    randomness: [u8; 32],
    nonce: u32,
) -> Result<()> {
    let round = &mut ctx.accounts.round;
    // a late answer to a request the player already retried, or a repeat: ignore it
    if round.status != RoundStatus::Rolling || round.nonce != nonce {
        msg!("stale grip callback ignored");
        return Ok(());
    }

    let roll = odds::roll_ppm(&randomness);
    let won = roll < round.need_ppm;
    let mut payout = 0;
    if won {
        payout = odds::payout(&round.config, round.target_kind)?;
        round.payout_pending = round
            .payout_pending
            .checked_add(payout)
            .ok_or(ClawError::Overflow)?;
        round.total_won = round.total_won.saturating_add(payout);
        round.wins = round.wins.saturating_add(1);
    }

    round.randomness = randomness;
    round.roll_ppm = roll;
    round.won = won;
    round.resolved_nonce = nonce;
    round.status = RoundStatus::Aiming;

    emit!(GripResolved {
        player: round.player,
        nonce,
        target_kind: round.target_kind,
        need_ppm: round.need_ppm,
        roll_ppm: roll,
        won,
        payout,
    });
    Ok(())
}
