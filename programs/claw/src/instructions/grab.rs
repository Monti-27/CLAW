use anchor_lang::{prelude::*, Discriminator};
use ephemeral_rollups_sdk::{
    anchor::vrf,
    vrf::{
        consts::{program_identity_pubkey, DEFAULT_EPHEMERAL_QUEUE, DEFAULT_EPHEMERAL_TEST_QUEUE},
        instructions::{create_request_randomness_ix_const, RequestRandomnessParams},
        types::SerializableAccountMeta,
    },
};

use crate::{constants::*, error::ClawError, merkle, odds, state::*};

/// Requester identity the VRF program signs callbacks for.
const PROGRAM_IDENTITY: Pubkey = program_identity_pubkey(&crate::ID);

/// The prize the claw is closing on, as laid out in the committed pile.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct GrabTarget {
    pub index: u16,
    pub kind: u8,
    pub x_mm: i16,
    pub z_mm: i16,
    pub proof: Vec<[u8; 32]>,
}

#[vrf]
#[derive(Accounts)]
pub struct Grab<'info> {
    /// The player, or the session key they registered for this round.
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut, seeds = [ROUND_SEED, round.player.as_ref()], bump = round.bump)]
    pub round: Box<Account<'info, Round>>,
    /// CHECK: MagicBlock VRF queue that lives on the rollup; pinned by address.
    #[account(
        mut,
        constraint = oracle_queue.key() == DEFAULT_EPHEMERAL_QUEUE
            || oracle_queue.key() == DEFAULT_EPHEMERAL_TEST_QUEUE
    )]
    pub oracle_queue: UncheckedAccount<'info>,
}

/// Ephemeral Rollup. Drops the claw where it stands. The program checks the
/// prize against the pile root, prices the grip from the claw's onchain
/// position, and asks MagicBlock VRF for the roll. `grip_callback` finishes it.
pub fn handle_grab(
    ctx: Context<Grab>,
    target: Option<GrabTarget>,
    client_seed: [u8; 32],
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let round = &mut ctx.accounts.round;
    round.authorize(&ctx.accounts.signer.key())?;

    match round.status {
        RoundStatus::Aiming => {
            require!(round.credits > 0, ClawError::NoCredits);
            round.credits -= 1;
            round.plays = round.plays.saturating_add(1);
        }
        // the oracle never answered: same credit, new request, old callback is ignored
        RoundStatus::Rolling => require!(round.roll_timed_out(now), ClawError::RollPending),
        RoundStatus::Closed => return err!(ClawError::RoundNotOpen),
    }

    round.nonce = round.nonce.wrapping_add(1);
    round.requested_at = now;
    round.clear_grab();

    if let Some(t) = &target {
        require!(
            t.proof.len() <= MAX_PROOF_DEPTH,
            ClawError::InvalidPrizeProof
        );
        require!(
            merkle::verify(
                &round.config.pile_root,
                merkle::leaf(t.index, t.kind, t.x_mm, t.z_mm),
                t.index,
                &t.proof,
            ),
            ClawError::InvalidPrizeProof
        );
        let d2 = odds::distance_sq(round.claw_x, round.claw_z, t.x_mm, t.z_mm);
        round.target_index = t.index;
        round.target_kind = t.kind;
        round.distance_mm = odds::isqrt(d2).min(u16::MAX as u64) as u16;
        round.need_ppm = odds::need_ppm(&round.config, t.kind, d2)?;
    }

    // closed on air, or on something out of reach: nothing to roll for
    if round.need_ppm == 0 {
        round.target_kind = NO_TARGET;
        round.status = RoundStatus::Aiming;
        round.resolved_nonce = round.nonce;
        return Ok(());
    }

    round.status = RoundStatus::Rolling;
    let nonce = round.nonce;
    let ix = create_request_randomness_ix_const(
        RequestRandomnessParams {
            payer: ctx.accounts.signer.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: crate::ID,
            callback_discriminator: crate::instruction::GripCallback::DISCRIMINATOR.to_vec(),
            caller_seed: client_seed,
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: ctx.accounts.round.key(),
                is_signer: false,
                is_writable: true,
            }]),
            callback_args: Some(nonce.to_le_bytes().to_vec()),
        },
        PROGRAM_IDENTITY,
    );
    ctx.accounts
        .invoke_signed_vrf(&ctx.accounts.signer.to_account_info(), &ix)?;
    Ok(())
}
