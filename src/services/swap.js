// src/services/swap.js
// Real USDC <-> EURC quote + swap execution on Arc Testnet via Circle App Kit,
// signed by the user's own connected wallet (no server-managed keys).
//
// Sources verified before writing this file:
//   - Swap call shape / chain identifier "Arc_Testnet":
//     https://docs.arc.network/app-kit/quickstarts/swap-tokens-same-chain
//   - Browser wallet adapter for Ethers v6:
//     https://developers.circle.com/bridge-kit/concepts/adapter-setups
//   - kitKey (legacy) -> apiKey (current) naming:
//     https://docs.arc.io/app-kit/swap
//
// IMPORTANT — API key exposure:
// Circle's apiKey for Swap authenticates your app's request volume (raises
// the shared rate limit); it is NOT a wallet private key. But because this
// runs in the browser, any value passed here is visible in the shipped JS
// bundle — Vite only exposes env vars prefixed VITE_, and those are public
// by design. Do not reuse this key for anything that grants account/wallet
// access. If Circle issues you a more sensitive key elsewhere (e.g. for
// Circle-Wallets/server flows), that one must stay server-side only and
// never end up in a VITE_ variable.

import { AppKit } from "@circle-fin/app-kit";
import { getCircleAdapter, getSigner } from "./wallet.js";

const ARC_CHAIN = "Arc_Testnet";

// Swap requests share a rate limit if no key is provided. Optional by design.
const CIRCLE_API_KEY = import.meta.env.VITE_CIRCLE_API_KEY || undefined;

const kit = new AppKit();

/**
 * Builds the SwapParams object shared by estimateSwap and swap.
 * Address is intentionally omitted — per Circle's docs, the Viem/Ethers
 * browser adapters resolve the connected address themselves.
 *
 * Allowance handling: kit.swap() defaults to allowanceStrategy: "permit"
 * (an off-chain EIP-2612 signed permit, verified via ecrecover) rather than
 * a separate on-chain approve() transaction. That default is what we want
 * here since the connected wallet is a plain EOA (MetaMask/Rabby via
 * BrowserProvider) — the user signs one thing, App Kit handles the
 * allowance internally. The "approve" strategy only exists for smart-
 * contract-account wallets (e.g. Circle Wallets SCA), whose ERC-1271
 * signatures aren't accepted by permit's ecrecover check — not applicable
 * to this project's wallet flow, so it's not used here.
 * Source: https://docs.arc.network/app-kit/references/sdk-reference
 *
 * @param {{ tokenIn, tokenOut, amountIn, slippageBps?: number }} args
 *   slippageBps is optional (e.g. 300 = 3% slippage tolerance).
 */
async function buildSwapParams({ tokenIn, tokenOut, amountIn, slippageBps }) {
  const adapter = await getCircleAdapter();

  return {
    from: {
      adapter,
      chain: ARC_CHAIN,
      // no `address` — the Ethers browser adapter resolves it from the
      // connected wallet.
    },
    tokenIn,
    tokenOut,
    amountIn: String(amountIn),
    config: {
      allowanceStrategy: "permit", // explicit, matches the default — see comment above
      ...(slippageBps !== undefined ? { slippageBps } : {}),
      ...(CIRCLE_API_KEY ? { apiKey: CIRCLE_API_KEY } : {}),
    },
  };
}

/**
 * Categorizes a thrown error from estimateSwap/swap into the status
 * strings the dashboard needs (Phase 12 of the spec: route unavailable,
 * quote expired, slippage exceeded, insufficient balance, etc).
 * Falls back to a generic message rather than guessing at fields the SDK
 * hasn't documented — real field names should be confirmed against a live
 * error payload once you're running real testnet swaps.
 */
function categorizeSwapError(err) {
  const message = err?.message?.toLowerCase() ?? "";

  if (message.includes("insufficient")) return { code: "insufficient_balance", raw: err };
  if (message.includes("route") || message.includes("liquidity")) return { code: "route_unavailable", raw: err };
  if (message.includes("slippage")) return { code: "slippage_exceeded", raw: err };
  if (message.includes("expired")) return { code: "quote_expired", raw: err };
  if (message.includes("reject")) return { code: "user_rejected", raw: err };
  if (message.includes("network") || message.includes("rpc")) return { code: "network_error", raw: err };

  return { code: "unknown", raw: err };
}

/**
 * Requests a real quote/estimate. Does not execute anything.
 * Phase 4 of the spec: amount, estimated output, rate, fees, slippage/min received.
 *
 * @param {{ tokenIn: "USDC"|"EURC", tokenOut: "USDC"|"EURC", amountIn: string|number }} params
 */
export async function getQuote({ tokenIn, tokenOut, amountIn, slippageBps }) {
  try {
    const swapParams = await buildSwapParams({ tokenIn, tokenOut, amountIn, slippageBps });
    const estimate = await kit.estimateSwap(swapParams);

    return {
      tokenIn: estimate.tokenIn,
      tokenOut: estimate.tokenOut,
      amountIn: estimate.amountIn,
      estimatedOutput: estimate.estimatedOutput, // { amount, token }
      stopLimit: estimate.stopLimit,             // { amount, token } — min received
      fees: estimate.fees,                        // [{ token, amount, type }]
      raw: estimate,
    };
  } catch (err) {
    throw categorizeSwapError(err);
  }
}

/**
 * Executes a real swap. The connected wallet will be prompted to sign.
 * Phase 5 of the spec: request quote implicitly happens server-side inside
 * kit.swap; this returns the real tx hash + explorer URL once settled.
 *
 * @param {{ tokenIn: "USDC"|"EURC", tokenOut: "USDC"|"EURC", amountIn: string|number }} params
 * @returns {Promise<{ txHash: string, explorerUrl: string, amountOut: string,
 *                      status: string, fees: Array }>}
 */
export async function executeSwap({ tokenIn, tokenOut, amountIn, slippageBps }) {
  try {
    const swapParams = await buildSwapParams({ tokenIn, tokenOut, amountIn, slippageBps });
    const result = await kit.swap(swapParams);

    return {
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
      amountIn: result.amountIn,
      amountOut: result.amountOut,
      fromAddress: result.fromAddress,
      toAddress: result.toAddress,
      fees: result.fees,
      status: result.progress?.status,       // e.g. "DONE"
      substatus: result.progress?.substatus, // e.g. "COMPLETED"
      raw: result,
    };
  } catch (err) {
    throw categorizeSwapError(err);
  }
}

/**
 * Convenience: confirms a signer/address is actually available before
 * attempting a quote or swap, so the UI can show "Connect Wallet" instead
 * of a confusing SDK error.
 */
export async function assertWalletReady() {
  const signer = await getSigner(); // throws a clear error if not connected
  return signer.getAddress();
}