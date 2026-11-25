use anchor_lang::prelude::*;

use crate::{constants::*, error::ClawError, state::*};

#[derive(Accounts)]
pub struct UpdateMachine<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [MACHINE_SEED],
        bump = machine.bump,
        has_one = authority @ ClawError::NotAuthority
    )]
    pub machine: Box<Account<'info, Machine>>,
}

/// Rounds keep the config they started with, so a change never touches a round in play.
pub fn handle_update_machine(ctx: Context<UpdateMachine>, config: MachineConfig) -> Result<()> {
    config.validate()?;
    ctx.accounts.machine.config = config;
    Ok(())
}
