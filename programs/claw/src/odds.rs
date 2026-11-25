//! Grip odds in integer fixed point. Mirrors `apps/web/src/features/round/odds.ts`:
//! hold = max(floor, min(cap, playPrice * payoutRatio * boost / value) * alignment)

use anchor_lang::prelude::*;

use crate::{constants::*, error::ClawError, state::MachineConfig};

/// Chance (ppm) that the claw holds a prize of `kind` grabbed `distance_sq_mm` off centre.
/// Returns 0 when the prize is out of reach.
pub fn need_ppm(config: &MachineConfig, kind: u8, distance_sq_mm: u64) -> Result<u32> {
    let value = *config
        .prize_values_x100
        .get(kind as usize)
        .ok_or(ClawError::InvalidPrizeKind)? as u64;
    let reach_sq = (config.reach_mm as u64).pow(2);
    if distance_sq_mm > reach_sq {
        return Ok(0);
    }

    // ratio (bps) * boost (bps) / value (x100) lands exactly on ppm:
    // (r / 1e4) * (b / 1e4) / (v / 1e2) * 1e6 = r * b / v
    let base = (config.payout_ratio_bps as u64)
        .checked_mul(config.boost_bps as u64)
        .and_then(|n| n.checked_div(value))
        .ok_or(ClawError::Overflow)?
        .min(config.cap_ppm as u64);

    let falloff = distance_sq_mm
        .checked_mul(ALIGNMENT_FALLOFF_PPM)
        .and_then(|n| n.checked_div(reach_sq))
        .ok_or(ClawError::Overflow)?;
    let alignment = PPM.saturating_sub(falloff);

    let hold = base
        .checked_mul(alignment)
        .and_then(|n| n.checked_div(PPM))
        .ok_or(ClawError::Overflow)?
        .max(config.floor_ppm as u64);
    Ok(hold as u32)
}

/// Lamports a prize of `kind` pays.
pub fn payout(config: &MachineConfig, kind: u8) -> Result<u64> {
    let value = *config
        .prize_values_x100
        .get(kind as usize)
        .ok_or(ClawError::InvalidPrizeKind)? as u128;
    let lamports = value
        .checked_mul(config.play_price as u128)
        .and_then(|n| n.checked_div(100))
        .ok_or(ClawError::Overflow)?;
    u64::try_from(lamports).map_err(|_| ClawError::Overflow.into())
}

/// Maps VRF output to a roll in [0, 1_000_000).
pub fn roll_ppm(randomness: &[u8; 32]) -> u32 {
    let mut head = [0u8; 8];
    head.copy_from_slice(&randomness[..8]);
    (u64::from_le_bytes(head) % PPM) as u32
}

pub fn distance_sq(ax: i16, az: i16, bx: i16, bz: i16) -> u64 {
    let dx = (ax as i64 - bx as i64).unsigned_abs();
    let dz = (az as i64 - bz as i64).unsigned_abs();
    dx * dx + dz * dz
}

/// Integer square root, for reporting the distance only.
pub fn isqrt(n: u64) -> u64 {
    if n < 2 {
        return n;
    }
    let mut x = n;
    let mut y = x.div_ceil(2);
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> MachineConfig {
        MachineConfig {
            play_price: 2_000_000,
            payout_ratio_bps: 8_000,
            boost_bps: 25_000,
            cap_ppm: 850_000,
            floor_ppm: 30_000,
            reach_mm: 80,
            min_x: -680,
            max_x: -60,
            min_z: -290,
            max_z: 300,
            home_x: -620,
            home_z: 250,
            // legend, sol, jup, bonk, capsule, coin, gem
            prize_values_x100: [5_000, 1_000, 500, 500, 200, 150, 400],
            pile_root: [0; 32],
            pile_seed: 7,
            pile_size: 100,
            max_credits: 10,
            validator: Pubkey::default(),
        }
    }

    #[test]
    fn matches_the_web_formula_dead_centre() {
        let c = config();
        // 1 * 0.8 * 2.5 / 50 = 0.04
        assert_eq!(need_ppm(&c, 0, 0).unwrap(), 40_000);
        // 2 / 10 = 0.2
        assert_eq!(need_ppm(&c, 1, 0).unwrap(), 200_000);
        // 2 / 2 = 1, capped at 0.85
        assert_eq!(need_ppm(&c, 4, 0).unwrap(), 850_000);
        // 2 / 4 = 0.5
        assert_eq!(need_ppm(&c, 6, 0).unwrap(), 500_000);
    }

    #[test]
    fn alignment_scales_the_chance() {
        let c = config();
        // half of reach: 1 - 0.25 * 0.6 = 0.85
        assert_eq!(need_ppm(&c, 6, 40 * 40).unwrap(), 425_000);
        // edge of reach: 1 - 0.6 = 0.4
        assert_eq!(need_ppm(&c, 6, 80 * 80).unwrap(), 200_000);
        // legend at the edge would be 0.016, lifted to the floor
        assert_eq!(need_ppm(&c, 0, 80 * 80).unwrap(), 30_000);
        // out of reach never holds
        assert_eq!(need_ppm(&c, 6, 81 * 81).unwrap(), 0);
    }

    #[test]
    fn unknown_kind_is_rejected() {
        assert!(need_ppm(&config(), 7, 0).is_err());
        assert!(payout(&config(), 200).is_err());
    }

    #[test]
    fn payout_is_value_times_price() {
        let c = config();
        assert_eq!(payout(&c, 0).unwrap(), 100_000_000); // 50 plays
        assert_eq!(payout(&c, 5).unwrap(), 3_000_000); // 1.5 plays
    }

    #[test]
    fn roll_is_always_below_one() {
        assert_eq!(roll_ppm(&[0; 32]), 0);
        assert!(roll_ppm(&[0xff; 32]) < PPM as u32);
    }

    #[test]
    fn integer_distance() {
        assert_eq!(distance_sq(-100, 50, -130, 10), 30 * 30 + 40 * 40);
        assert_eq!(isqrt(2_500), 50);
        assert_eq!(isqrt(2_499), 49);
        assert_eq!(isqrt(0), 0);
    }
}
