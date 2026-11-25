use anchor_lang::prelude::*;

use crate::{constants::*, error::ClawError, state::*, vault};

#[derive(Accounts)]
pub struct WithdrawVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [MACHINE_SEED],
        bump = machine.bump,
        has_one = authority @ ClawError::NotAuthority
    )]
    pub machine: Box<Account<'info, Machine>>,
    /// CHECK: System-owned prize pool PDA; checked by seeds.
    #[account(mut, seeds = [VAULT_SEED, machine.key().as_ref()], bump = machine.vault_bump)]
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_withdraw_vault(ctx: Context<WithdrawVault>, lamports: u64) -> Result<()> {
    vault::pay_out(
        &ctx.accounts.system_program,
        &ctx.accounts.machine.key(),
        ctx.accounts.machine.vault_bump,
        &ctx.accounts.vault.to_account_info(),
        &ctx.accounts.authority.to_account_info(),
        lamports,
    )
}
