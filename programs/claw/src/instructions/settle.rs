use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::{
    anchor::commit,
    ephem::{FoldableIntentBuilder, MagicIntentBundleBuilder},
};

use crate::{constants::*, error::ClawError, state::*};

#[commit]
#[derive(Accounts)]
pub struct Settle<'info> {
    /// The player, or the session key they registered for this round.
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut, seeds = [ROUND_SEED, round.player.as_ref()], bump = round.bump)]
    pub round: Box<Account<'info, Round>>,
}

/// Ephemeral Rollup. Ends the session: unused credits become a refund, the
/// round is committed to Solana and handed back to this program there.
pub fn handle_settle(ctx: Context<Settle>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let round = &mut ctx.accounts.round;
    round.authorize(&ctx.accounts.signer.key())?;

    if round.status == RoundStatus::Rolling {
        require!(round.roll_timed_out(now), ClawError::RollPending);
        // the grab never got its roll: give the credit back
        round.credits = round.credits.saturating_add(1);
        round.plays = round.plays.saturating_sub(1);
    }

    let refund = round
        .config
        .play_price
        .checked_mul(round.credits as u64)
        .ok_or(ClawError::Overflow)?;
    round.payout_pending = round
        .payout_pending
        .checked_add(refund)
        .ok_or(ClawError::Overflow)?;
    round.credits = 0;
    round.status = RoundStatus::Closed;
    round.session_key = Pubkey::default();

    // write the final state before the commit reads the account
    round.exit(&crate::ID)?;
    MagicIntentBundleBuilder::new(
        ctx.accounts.signer.to_account_info(),
        ctx.accounts.magic_context.to_account_info(),
        ctx.accounts.magic_program.to_account_info(),
    )
    .commit_and_undelegate(&[ctx.accounts.round.to_account_info()])
    .build_and_invoke()?;
    Ok(())
}
