// Types for Helius Enhanced Transactions API
// https://docs.helius.dev/solana-apis/enhanced-transactions-api

export type HeliusTxType =
  | "UNKNOWN"
  | "TRANSFER"
  | "SWAP"
  | "NFT_SALE"
  | "NFT_MINT"
  | "NFT_LISTING"
  | "NFT_BID"
  | "NFT_CANCEL_LISTING"
  | "NFT_CANCEL_BID"
  | "TOKEN_MINT"
  | "BURN"
  | "BURN_NFT"
  | "STAKE_SOL"
  | "UNSTAKE_SOL"
  | "WITHDRAW"
  | "DEPOSIT"
  | "INIT_BANK"
  | string;

export type HeliusSource =
  | "PUMP_FUN"
  | "RAYDIUM"
  | "JUPITER"
  | "ORCA"
  | "MAGIC_EDEN"
  | "TENSOR"
  | "SYSTEM_PROGRAM"
  | "SOLANA_PROGRAM_LIBRARY"
  | "UNKNOWN"
  | string;

export interface HeliusTokenAmount {
  userAccount: string;
  tokenAccount: string;
  rawTokenAmount: { tokenAmount: string; decimals: number };
}

export interface HeliusTokenTransfer {
  fromUserAccount?: string;
  toUserAccount?: string;
  fromTokenAccount?: string;
  toTokenAccount?: string;
  tokenAmount?: number;
  mint?: string;
  tokenStandard?: string;
}

export interface HeliusNativeTransfer {
  fromUserAccount?: string;
  toUserAccount?: string;
  amount?: number;
}

export interface HeliusInstruction {
  accounts?: string[];
  data?: string;
  programId?: string;
  innerInstructions?: HeliusInstruction[];
}

export interface HeliusAccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges?: HeliusTokenAmount[];
}

export interface HeliusSwapEvent {
  nativeInput?:  { account: string; amount: string };
  nativeOutput?: { account: string; amount: string };
  tokenInputs?:  HeliusTokenAmount[];
  tokenOutputs?: HeliusTokenAmount[];
  tokenFees?:    HeliusTokenAmount[];
  nativeFees?:   { account: string; amount: string }[];
  innerSwaps?:   unknown[];
}

export interface HeliusEvents {
  nft?:        unknown;
  swap?:       HeliusSwapEvent;
  compressed?: unknown;
  distributeCompressionRewards?: unknown;
  setAuthority?: unknown;
}

export interface HeliusEnhancedTransaction {
  signature:      string;
  description?:   string;
  type?:          HeliusTxType;
  source?:        HeliusSource;
  fee?:           number;
  feePayer?:      string;
  timestamp?:     number;
  slot?:          number;
  nativeTransfers?: HeliusNativeTransfer[];
  tokenTransfers?:  HeliusTokenTransfer[];
  accountData?:     HeliusAccountData[];
  instructions?:    HeliusInstruction[];
  events?:          HeliusEvents;
  transactionError?: { error: string } | null;
}

// Webhook payload — Helius sends an array of enhanced transactions
export type HeliusWebhookPayload = HeliusEnhancedTransaction[];
