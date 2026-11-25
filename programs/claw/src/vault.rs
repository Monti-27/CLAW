//! The vault is a System-owned PDA that only ever holds SOL.

use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::{constants::VAULT_SEED, error::ClawError};

/// Lamports the vault can pay without dropping below rent exemption.
pub fn spendable(vault: &AccountInfo) -> Result<u64> {
    let keep = Rent::get()?.minimum_balance(0);
    Ok(vault.lamports().saturating_sub(keep))
}

pub fn pay_in<'info>(
    system_program: &Program<'info, System>,
    from: &AccountInfo<'info>,
    vault: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    transfer(
        CpiContext::new(
            system_program.key(),
            Transfer {
                from: from.clone(),
                to: vault.clone(),
            },
        ),
        lamports,
    )
}

pub fn pay_out<'info>(
    system_program: &Program<'info, System>,
    machine: &Pubkey,
    vault_bump: u8,
    vault: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    require!(spendable(vault)? >= lamports, ClawError::VaultEmpty);
    transfer(
        CpiContext::new_with_signer(
            system_program.key(),
            Transfer {
                from: vault.clone(),
                to: to.clone(),
            },
            &[&[VAULT_SEED, machine.as_ref(), &[vault_bump]]],
        ),
        lamports,
    )
}
