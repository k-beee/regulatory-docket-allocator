/**
 * GenLayer Studionet Network & Rulemaking Configuration
 * Author: k bee (k-beee)
 */

export const NETWORK_CONFIG = {
  chainId: 61999,
  chainName: 'GenLayer Studionet',
  rpcUrl: 'https://studio.genlayer.com/api',
  currencySymbol: 'GEN',
  explorerUrl: 'https://explorer-studio.genlayer.com',
};

// Default deployed contract address (live on Studionet)
export const DEFAULT_CONTRACT_ADDRESS = '0xC2E3b411A4b5BD691A42285A47111BD91d541962';

// Allowed EIP-6963 Wallet RDNS identifiers
export const ALLOWED_WALLET_RDNS = [
  'io.metamask',
  'com.okex.wallet',
  'io.rabby',
  'app.phantom',
  'com.brave.wallet',
];

export const WITNESS_REASON_LABELS: Record<string, string> = {
  PRIMARY_IMPACT_WITNESS: 'Lead Oral Witness (Top-Ranked Representative for Regulatory Impact Domain)',
  SECONDARY_IMPACT_DEPTH: 'Depth Oral Witness (Proportional Representation within Impact Cap)',
  IMPACT_CAP_REACHED: 'Regulatory Impact Domain Maximum Witness Cap (3) Reached',
  SLOT_CAPACITY_LIMIT: 'Hearing Schedule Capacity Reached with Higher-Ranked Witnesses',
  LOWER_RELEVANCE_RANKING: 'Lower Relative Substantive Relevance / Tie-Break Score',
  DUPLICATE_ASTROTURF: 'Disqualified: Identified as Near-Duplicate Astroturfed Form Letter',
  PROVENANCE_DISQUALIFIED: 'Disqualified: Cryptographic Digest Provenance Mismatch post-freeze',
  OUT_OF_SCOPE_IRRELEVANT: 'Disqualified: Evaluated as Out of Scope or Irrelevant to NPRM Charter',
};
