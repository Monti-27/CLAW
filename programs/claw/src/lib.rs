//! CLAW: an onchain claw machine.
//!
//! Base layer (Solana): the machine, its prize pool, buying credits, payouts.
//! Ephemeral Rollup (MagicBlock): steering the claw, the grab, and the VRF
//! roll that decides whether the grip holds.

pub mod constants;
pub mod error;
pub mod instructions;
pub mod merkle;
pub mod odds;
pub mod state;
pub mod vault;

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("2gjcfh2Yp4iuD3TDPxtpRPY16L85nL9rQhoQM5YDYSLo");

#[ephemeral]
#[program]
pub mod claw {
    use super::*;

    // ---- machine (base layer, authority) ----

    pub fn initialize_machine(
        ctx: Context<InitializeMachine>,
        config: MachineConfig,
    ) -> Result<()> {
        instructions::initialize_machine::handle_initialize_machine(ctx, config)
    }

    pub fn update_machine(ctx: Context<UpdateMachine>, config: MachineConfig) -> Result<()> {
        instructions::update_machine::handle_update_machine(ctx, config)
    }

    pub fn fund_vault(ctx: Context<FundVault>, lamports: u64) -> Result<()> {
        instructions::fund_vault::handle_fund_vault(ctx, lamports)
    }

    pub fn withdraw_vault(ctx: Context<WithdrawVault>, lamports: u64) -> Result<()> {
        instructions::withdraw_vault::handle_withdraw_vault(ctx, lamports)
    }

    // ---- round setup (base layer, player) ----

    pub fn start_round(ctx: Context<StartRound>, credits: u8, session_key: Pubkey) -> Result<()> {
        instructions::start_round::handle_start_round(ctx, credits, session_key)
    }

    pub fn delegate_round(ctx: Context<DelegateRound>) -> Result<()> {
        instructions::delegate_round::handle_delegate_round(ctx)
    }

    // ---- play (Ephemeral Rollup, player or session key) ----

    pub fn move_claw(ctx: Context<MoveClaw>, x_mm: i16, z_mm: i16) -> Result<()> {
        instructions::move_claw::handle_move_claw(ctx, x_mm, z_mm)
    }

    pub fn grab(
        ctx: Context<Grab>,
        target: Option<GrabTarget>,
        client_seed: [u8; 32],
    ) -> Result<()> {
        instructions::grab::handle_grab(ctx, target, client_seed)
    }

    /// Called by MagicBlock VRF only.
    pub fn grip_callback(
        ctx: Context<GripCallback>,
        randomness: [u8; 32],
        nonce: u32,
    ) -> Result<()> {
        instructions::grip_callback::handle_grip_callback(ctx, randomness, nonce)
    }

    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        instructions::settle::handle_settle(ctx)
    }

    // ---- payout (base layer) ----

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::claim::handle_claim(ctx)
    }
}
