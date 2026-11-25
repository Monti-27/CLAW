use anchor_lang::prelude::*;

use crate::{constants::*, error::ClawError, state::*};

#[derive(Accounts)]
pub struct MoveClaw<'info> {
    /// The player, or the session key they registered for this round.
    pub signer: Signer<'info>,
    #[account(mut, seeds = [ROUND_SEED, round.player.as_ref()], bump = round.bump)]
    pub round: Box<Account<'info, Round>>,
}

/// Ephemeral Rollup. Steers the claw; sent many times a second while a button is held.
pub fn handle_move_claw(ctx: Context<MoveClaw>, x_mm: i16, z_mm: i16) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let round = &mut ctx.accounts.round;
    round.authorize(&ctx.accounts.signer.key())?;
    // steerable while aiming, and again once a roll has timed out (the grab can then be retried)
    require!(
        round.status == RoundStatus::Aiming || round.roll_timed_out(now),
        ClawError::RoundNotOpen
    );
    require!(round.config.in_bounds(x_mm, z_mm), ClawError::OutOfBounds);

    round.claw_x = x_mm;
    round.claw_z = z_mm;
    round.moves = round.moves.wrapping_add(1);
    Ok(())
}
