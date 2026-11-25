use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::{anchor::delegate, cpi::DelegateConfig};

use crate::{constants::*, error::ClawError, state::*};

#[delegate]
#[derive(Accounts)]
pub struct DelegateRound<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(seeds = [MACHINE_SEED], bump = machine.bump)]
    pub machine: Box<Account<'info, Machine>>,
    /// CHECK: The player's round PDA. Untyped because it changes owner in this instruction.
    #[account(mut, del, seeds = [ROUND_SEED, player.key().as_ref()], bump)]
    pub round: UncheckedAccount<'info>,
    /// CHECK: Rollup validator to delegate to; must match the machine when one is pinned.
    pub validator: Option<UncheckedAccount<'info>>,
}

/// Base layer. Hands the round to the Ephemeral Rollup. From here until
/// `settle`, every move and grab runs there.
pub fn handle_delegate_round(ctx: Context<DelegateRound>) -> Result<()> {
    let pinned = ctx.accounts.machine.config.validator;
    let validator = ctx.accounts.validator.as_ref().map(|v| v.key());
    if pinned != Pubkey::default() {
        require!(validator == Some(pinned), ClawError::WrongValidator);
    }

    ctx.accounts.delegate_round(
        &ctx.accounts.player,
        &[ROUND_SEED, ctx.accounts.player.key().as_ref()],
        DelegateConfig {
            validator,
            ..Default::default()
        },
    )?;
    Ok(())
}
