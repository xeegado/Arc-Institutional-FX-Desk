// src/constants/arcNetwork.js
// Re-exports src/config/arc.js in the shape the dashboard components expect.
// Single source of truth stays in config/arc.js — don't duplicate values here.

import { ARC_TESTNET, ARC_TESTNET_WALLET_PARAMS } from "../config/arc.js";

export const ARC_TESTNET_PARAMS = ARC_TESTNET_WALLET_PARAMS;

export const ARC_TOKENS = {
  USDC: ARC_TESTNET.tokens.usdc,
  EURC: ARC_TESTNET.tokens.eurc,
};

// NOTE: There is no "Arc router" — App Kit's Swap capability handles routing
// internally (see src/services/swap.js). Components should not need a raw
// router contract address; if you find yourself reaching for one, that's a
// sign the swap is bypassing App Kit and needs to go through swap.js instead.