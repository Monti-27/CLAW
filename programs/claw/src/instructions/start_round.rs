use anchor_lang::prelude::*;

use crate::{constants::*, error::ClawError, state::*, vault};

#[derive(Accounts)]
pub struct StartRound<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut, seeds = [MACHINE_SEED], bump = machine.bump)]
    pub machine: Box<Account<'info, Machine>>,
    /// CHECK: System-owned prize pool PDA; checked by seeds.
    #[account(mut, seeds = [VAULT_SEED, machine.key().as_ref()], bump = machine.vault_bump)]
    pub vault: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = player,
        space = 8 + Round::INIT_SPACE,
        seeds = [ROUND_SEED, player.key().as_ref()],
        bump
    )]
    pub round: Box<Account<'info, Round>>,
    pub system_program: Program<'info, System>,
}

/// Base layer. Buys credits, pays out anything still owed from the last
/// round, and resets the seat. `delegate_round` follows in the same transaction.
pub fn handle_start_round(
    ctx: Context<StartRound>,
    credits: u8,
    session_key: Pubkey,
) -> Result<()> {
    let config = ctx.accounts.machine.config;
    require!(
        credits > 0 && credits <= config.max_credits,
        ClawError::InvalidCredits
    );
    let fresh = ctx.accounts.round.player == Pubkey::default();
    require!(
        fresh || ctx.accounts.round.status == RoundStatus::Closed,
        ClawError::RoundActive
    );

    // winnings first, so a player never pays in while the machine owes them
    let owed = ctx.accounts.round.payout_pending;
    if owed > 0 && vault::spendable(&ctx.accounts.vault)? >= owed {
        vault::pay_out(
            &ctx.accounts.system_program,
            &ctx.accounts.machine.key(),
            ctx.accounts.machine.vault_bump,
            &ctx.accounts.vault.to_account_info(),
            &ctx.accounts.player.to_account_info(),
            owed,
        )?;
        ctx.accounts.round.payout_pending = 0;
        let machine = &mut ctx.accounts.machine;
        machine.paid_out = machine.paid_out.saturating_add(owed);
    }

    let cost = config
        .play_price
        .checked_mul(credits as u64)
        .ok_or(ClawError::Overflow)?;
    vault::pay_in(
        &ctx.accounts.system_program,
        &ctx.accounts.player.to_account_info(),
        &ctx.accounts.vault.to_account_info(),
        cost,
    )?;

    let machine_key = ctx.accounts.machine.key();
    let round = &mut ctx.accounts.round;
    round.player = ctx.accounts.player.key();
    round.session_key = session_key;
    round.machine = machine_key;
    round.config = config;
    round.status = RoundStatus::Aiming;
    round.credits = credits;
    round.claw_x = config.home_x;
    round.claw_z = config.home_z;
    round.requested_at = 0;
    round.resolved_nonce = round.nonce;
    round.clear_grab();
    round.bump = ctx.bumps.round;

    let machine = &mut ctx.accounts.machine;
    machine.rounds_started = machine.rounds_started.saturating_add(1);
    machine.credits_sold = machine.credits_sold.saturating_add(credits as u64);
    Ok(())
}
