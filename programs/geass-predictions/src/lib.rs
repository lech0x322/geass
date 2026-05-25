use anchor_lang::prelude::*;

// Replace after `anchor keys list` and `anchor deploy --provider.cluster devnet`
declare_id!("GEASSPred1111111111111111111111111111111111");

pub const MAX_QUESTION_LEN: usize = 200;
pub const MAX_OUTCOME_LEN:  usize = 60;
pub const MIN_BET_LAMPORTS: u64   = 1_000_000; // 0.001 SOL
pub const MARKET_SEED:   &[u8]    = b"market";
pub const POSITION_SEED: &[u8]    = b"position";

#[program]
pub mod geass_predictions {
    use super::*;

    /// Create a new prediction market.
    /// `market_id` is chosen by the creator client-side (e.g. Date.now()).
    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        question: String,
        outcome_a: String,
        outcome_b: String,
        resolution_ts: i64,
    ) -> Result<()> {
        require!(question.len() >= 1 && question.len() <= MAX_QUESTION_LEN, PredError::InvalidQuestion);
        require!(outcome_a.len() >= 1 && outcome_a.len() <= MAX_OUTCOME_LEN, PredError::InvalidOutcome);
        require!(outcome_b.len() >= 1 && outcome_b.len() <= MAX_OUTCOME_LEN, PredError::InvalidOutcome);

        let clock = Clock::get()?;
        require!(resolution_ts > clock.unix_timestamp, PredError::ResolutionInPast);

        let m = &mut ctx.accounts.market;
        m.creator         = ctx.accounts.creator.key();
        m.question        = question;
        m.outcome_a       = outcome_a;
        m.outcome_b       = outcome_b;
        m.resolution_ts   = resolution_ts;
        m.total_a         = 0;
        m.total_b         = 0;
        m.resolved        = false;
        m.winning_outcome = 255; // 255=unresolved, 0=A wins, 1=B wins, 2=void
        m.market_id       = market_id;
        m.bump            = ctx.bumps.market;
        Ok(())
    }

    /// Place or increase a bet. One position per user per market; outcome cannot change.
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        outcome: u8,   // 0=A, 1=B
        amount: u64,   // lamports
    ) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(!m.resolved, PredError::MarketResolved);
        require!(outcome == 0 || outcome == 1, PredError::InvalidOutcome);
        require!(amount >= MIN_BET_LAMPORTS, PredError::BetTooSmall);

        let clock = Clock::get()?;
        require!(clock.unix_timestamp < m.resolution_ts, PredError::MarketExpired);

        let pos = &mut ctx.accounts.position;
        if pos.amount == 0 {
            pos.market  = m.key();
            pos.user    = ctx.accounts.user.key();
            pos.outcome = outcome;
            pos.claimed = false;
            pos.bump    = ctx.bumps.position;
        } else {
            require!(pos.outcome == outcome, PredError::OutcomeMismatch);
        }

        // Lamport trick: transfer SOL from signer → program-owned market PDA
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.market.to_account_info().try_borrow_mut_lamports()? += amount;

        pos.amount = pos.amount.checked_add(amount).ok_or(PredError::Overflow)?;
        if outcome == 0 {
            m.total_a = m.total_a.checked_add(amount).ok_or(PredError::Overflow)?;
        } else {
            m.total_b = m.total_b.checked_add(amount).ok_or(PredError::Overflow)?;
        }

        emit!(BetPlaced { market: m.key(), user: ctx.accounts.user.key(), outcome, amount });
        Ok(())
    }

    /// Resolve the market (creator only, after resolution_ts).
    /// winning_outcome: 0=A, 1=B, 2=void (full refunds)
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winning_outcome: u8,
    ) -> Result<()> {
        require!(winning_outcome <= 2, PredError::InvalidOutcome);
        let m = &mut ctx.accounts.market;
        require!(!m.resolved, PredError::MarketResolved);
        let clock = Clock::get()?;
        require!(clock.unix_timestamp >= m.resolution_ts, PredError::TooEarlyToResolve);

        m.resolved        = true;
        m.winning_outcome = winning_outcome;
        emit!(MarketResolved { market: m.key(), winning_outcome });
        Ok(())
    }

    /// Claim winnings. Losers: idempotent no-op. Void: full refund.
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let m   = &ctx.accounts.market;
        let pos = &mut ctx.accounts.position;
        require!(m.resolved, PredError::MarketNotResolved);
        require!(!pos.claimed, PredError::AlreadyClaimed);

        pos.claimed = true;

        let payout: u64 = if m.winning_outcome == 2 {
            pos.amount // void → full refund
        } else if pos.outcome == m.winning_outcome {
            let total_pool   = m.total_a.checked_add(m.total_b).ok_or(PredError::Overflow)?;
            let winning_side = if m.winning_outcome == 0 { m.total_a } else { m.total_b };
            require!(winning_side > 0, PredError::DivisionByZero);
            ((pos.amount as u128)
                .checked_mul(total_pool as u128).ok_or(PredError::Overflow)?
                .checked_div(winning_side as u128).ok_or(PredError::DivisionByZero)?) as u64
        } else {
            return Ok(()); // loser
        };

        **ctx.accounts.market.to_account_info().try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += payout;
        Ok(())
    }
}

// ─── Contexts ─────────────────────────────────────────────────────────────────
#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(init, payer = creator, space = Market::SPACE,
        seeds = [MARKET_SEED, creator.key().as_ref(), &market_id.to_le_bytes()], bump)]
    pub market: Account<'info, Market>,
    #[account(mut)] pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut,
        seeds = [MARKET_SEED, market.creator.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump)]
    pub market: Account<'info, Market>,
    #[account(init_if_needed, payer = user, space = Position::SPACE,
        seeds = [POSITION_SEED, market.key().as_ref(), user.key().as_ref()], bump)]
    pub position: Account<'info, Position>,
    #[account(mut)] pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut,
        seeds = [MARKET_SEED, market.creator.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump, has_one = creator)]
    pub market: Account<'info, Market>,
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut,
        seeds = [MARKET_SEED, market.creator.as_ref(), &market.market_id.to_le_bytes()],
        bump = market.bump)]
    pub market: Account<'info, Market>,
    #[account(mut,
        seeds = [POSITION_SEED, market.key().as_ref(), user.key().as_ref()],
        bump = position.bump)]
    pub position: Account<'info, Position>,
    #[account(mut)] pub user: Signer<'info>,
}

// ─── State ────────────────────────────────────────────────────────────────────
#[account]
pub struct Market {
    pub creator:         Pubkey,  // 32
    pub question:        String,  // 4 + MAX_QUESTION_LEN
    pub outcome_a:       String,  // 4 + MAX_OUTCOME_LEN
    pub outcome_b:       String,  // 4 + MAX_OUTCOME_LEN
    pub resolution_ts:   i64,     // 8
    pub total_a:         u64,     // 8
    pub total_b:         u64,     // 8
    pub resolved:        bool,    // 1
    pub winning_outcome: u8,      // 1  (0=A,1=B,2=void,255=unresolved)
    pub market_id:       u64,     // 8
    pub bump:            u8,      // 1
}
impl Market {
    pub const SPACE: usize = 8 + 32
        + (4 + MAX_QUESTION_LEN) + (4 + MAX_OUTCOME_LEN) + (4 + MAX_OUTCOME_LEN)
        + 8 + 8 + 8 + 1 + 1 + 8 + 1;
}

#[account]
pub struct Position {
    pub market:  Pubkey, // 32
    pub user:    Pubkey, // 32
    pub outcome: u8,     // 1
    pub amount:  u64,    // 8
    pub claimed: bool,   // 1
    pub bump:    u8,     // 1
}
impl Position {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 8 + 1 + 1;
}

// ─── Events ───────────────────────────────────────────────────────────────────
#[event] pub struct BetPlaced    { pub market: Pubkey, pub user: Pubkey, pub outcome: u8, pub amount: u64 }
#[event] pub struct MarketResolved { pub market: Pubkey, pub winning_outcome: u8 }

// ─── Errors ───────────────────────────────────────────────────────────────────
#[error_code]
pub enum PredError {
    #[msg("Question must be 1–200 chars")]      InvalidQuestion,
    #[msg("Outcome must be 1–60 chars")]        InvalidOutcome,
    #[msg("Resolution timestamp in the past")]  ResolutionInPast,
    #[msg("Market already resolved")]           MarketResolved,
    #[msg("Minimum bet is 0.001 SOL")]          BetTooSmall,
    #[msg("Market deadline has passed")]        MarketExpired,
    #[msg("Cannot switch outcomes")]            OutcomeMismatch,
    #[msg("Arithmetic overflow")]               Overflow,
    #[msg("Too early to resolve")]              TooEarlyToResolve,
    #[msg("Market not yet resolved")]           MarketNotResolved,
    #[msg("Already claimed")]                   AlreadyClaimed,
    #[msg("Division by zero")]                  DivisionByZero,
}
