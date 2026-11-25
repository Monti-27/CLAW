use anchor_lang::prelude::*;

use crate::{constants::*, state::*, vault};

#[derive(Accounts)]
pub struct FundVault<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,
    #[account(seeds = [MACHINE_SEED], bump = machine.bump)]
    pub machine: Box<Account<'info, Machine>>,
    /// CHECK: System-owned prize pool PDA; checked by seeds.
    #[account(mut, seeds = [VAULT_SEED, machine.key().as_ref()], bump = machine.vault_bump)]
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_fund_vault(ctx: Context<FundVault>, lamports: u64) -> Result<()> {
    vault::pay_in(
        &ctx.accounts.system_program,
        &ctx.accounts.funder.to_account_info(),
        &ctx.accounts.vault.to_account_info(),
        lamports,
    )
}
