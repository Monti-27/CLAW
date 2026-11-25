use anchor_lang::prelude::*;

use crate::{constants::*, error::ClawError, state::*, vault};

#[derive(Accounts)]
pub struct Claim<'info> {
    /// Anyone can crank a claim; the lamports only ever go to the player.
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Receives the payout; must be the round's player.
    #[account(mut, address = round.player)]
    pub player: UncheckedAccount<'info>,
    #[account(mut, seeds = [MACHINE_SEED], bump = machine.bump)]
    pub machine: Box<Account<'info, Machine>>,
    /// CHECK: System-owned prize pool PDA; checked by seeds.
    #[account(mut, seeds = [VAULT_SEED, machine.key().as_ref()], bump = machine.vault_bump)]
    pub vault: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [ROUND_SEED, round.player.as_ref()],
        bump = round.bump,
        constraint = round.machine == machine.key()
    )]
    pub round: Box<Account<'info, Round>>,
    pub system_program: Program<'info, System>,
}

/// Base layer, after `settle` has landed. Pays what the round is owed.
pub fn handle_claim(ctx: Context<Claim>) -> Result<()> {
    require!(
        ctx.accounts.round.status == RoundStatus::Closed,
        ClawError::RoundActive
    );
    let owed = ctx.accounts.round.payout_pending;
    require!(owed > 0, ClawError::NothingToClaim);

    // zero first, so nothing can be paid twice
    ctx.accounts.round.payout_pending = 0;
    vault::pay_out(
        &ctx.accounts.system_program,
        &ctx.accounts.machine.key(),
        ctx.accounts.machine.vault_bump,
        &ctx.accounts.vault.to_account_info(),
        &ctx.accounts.player.to_account_info(),
        owed,
    )?;
    let machine = &mut ctx.accounts.machine;
    machine.paid_out = machine.paid_out.saturating_add(owed);
    Ok(())
}
