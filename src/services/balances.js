// src/services/balances.js
// Reads real USDC / EURC balances for the connected wallet on Arc Testnet.
//
// Deliberately uses ONLY the ERC-20 interface (balanceOf, 6 decimals) for
// both tokens, never the native eth_getBalance (18 decimals). Arc's own
// docs recommend this to avoid mixing the two USDC interfaces:
//   https://docs.arc.io/arc/references/contract-addresses
//
// USDC on Arc has no separate "wrapped" contract — the ERC-20 interface at
// tokens.usdc.address reads the same underlying balance as the native gas
// token, just through IERC20 (transfer/approve/balanceOf) instead of
// eth_getBalance. EURC is a normal ERC-20 token, no native counterpart.

import { Contract, formatUnits } from "ethers";
import { ARC_TESTNET } from "../config/arc.js";
import { getProvider } from "./wallet.js";

// Minimal ERC-20 read ABI — only what balance reading needs.
const ERC20_BALANCE_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

/**
 * Reads a single token's balance for an address.
 * @param {"usdc" | "eurc"} tokenKey
 * @param {string} address
 * @returns {Promise<{ symbol: string, raw: bigint, formatted: string }>}
 */
export async function getTokenBalance(tokenKey, address) {
  const token = ARC_TESTNET.tokens[tokenKey];
  if (!token) {
    throw new Error(`Unknown token key: ${tokenKey}`);
  }

  const provider = getProvider();
  const contract = new Contract(token.address, ERC20_BALANCE_ABI, provider);

  const raw = await contract.balanceOf(address);

  return {
    symbol: token.symbol,
    raw, // bigint, smallest units (6 decimals)
    formatted: formatUnits(raw, token.decimals),
  };
}

/**
 * Reads USDC and EURC balances together for the connected address.
 * This is the main function the dashboard's balance panel should call —
 * both on initial connect and after a swap settles, to refresh the numbers.
 *
 * @param {string} address
 * @returns {Promise<{ usdc: { formatted: string, raw: bigint },
 *                      eurc: { formatted: string, raw: bigint } }>}
 */
export async function getBalances(address) {
  const [usdc, eurc] = await Promise.all([
    getTokenBalance("usdc", address),
    getTokenBalance("eurc", address),
  ]);

  return { usdc, eurc };
}

/**
 * Convenience helper for a live-updating balance panel: polls getBalances()
 * on an interval and calls onUpdate with each result. Returns a stop()
 * function to clear the interval.
 *
 * Prefer calling getBalances() directly right after a swap settles (Phase 3
 * of the spec: "After a successful transaction, refresh the balances") over
 * relying on polling alone — polling is a fallback for catching balance
 * changes from outside the app (e.g. a faucet claim in another tab).
 *
 * @param {string} address
 * @param {(balances: { usdc: object, eurc: object }) => void} onUpdate
 * @param {number} intervalMs
 */
export function watchBalances(address, onUpdate, intervalMs = 15000) {
  let cancelled = false;

  const tick = async () => {
    try {
      const balances = await getBalances(address);
      if (!cancelled) onUpdate(balances);
    } catch (err) {
      // Swallow poll errors (e.g. transient RPC hiccup) — don't crash the
      // interval loop. Callers doing a one-off read should call
      // getBalances() directly and handle errors themselves.
      console.error("watchBalances: failed to fetch balances", err);
    }
  };

  tick(); // fire immediately, then on the interval
  const id = setInterval(tick, intervalMs);

  return function stop() {
    cancelled = true;
    clearInterval(id);
  };
}