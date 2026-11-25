use anchor_lang::prelude::*;

use crate::{constants::*, state::*};

#[derive(Accounts)]
pub struct InitializeMachine<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Machine::INIT_SPACE,
        seeds = [MACHINE_SEED],
        bump
    )]
    pub machine: Box<Account<'info, Machine>>,
    /// CHECK: System-owned PDA that holds the prize pool; checked by seeds.
    #[account(mut, seeds = [VAULT_SEED, machine.key().as_ref()], bump)]
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_machine(
    ctx: Context<InitializeMachine>,
    config: MachineConfig,
) -> Result<()> {
    config.validate()?;
    let machine = &mut ctx.accounts.machine;
    machine.authority = ctx.accounts.authority.key();
    machine.config = config;
    machine.rounds_started = 0;
    machine.credits_sold = 0;
    machine.paid_out = 0;
    machine.bump = ctx.bumps.machine;
    machine.vault_bump = ctx.bumps.vault;
    Ok(())
}
