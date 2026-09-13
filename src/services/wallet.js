// src/services/wallet.js
// Wallet connection + network management for Arc Testnet.
//
// Two layers on purpose:
//   1. Plain ethers v6 BrowserProvider — for connect/disconnect, address,
//      network detection, and prompting a network switch. This is standard
//      EIP-1193 / ethers usage and has nothing Circle-specific about it.
//   2. A lazily-created Circle Ethers v6 adapter (createEthersAdapterFromProvider)
//      — only needed when you actually call into App Kit / Swap Kit
//      (kit.swap, kit.estimateSwap, etc). Kept separate so the wallet
//      connect flow doesn't depend on App Kit being installed/configured.
//
// Source for createEthersAdapterFromProvider:
//   https://www.npmjs.com/package/@circle-fin/adapter-ethers-v6
//   https://docs.arc.network/app-kit/tutorials/adapter-setups

import { BrowserProvider } from "ethers";
import { createEthersAdapterFromProvider } from "@circle-fin/adapter-ethers-v6";
import { ARC_TESTNET, ARC_TESTNET_WALLET_PARAMS } from "../config/arc.js";

// --- Errors -----------------------------------------------------------

export class NoWalletError extends Error {
  constructor() {
    super("No EVM wallet found. Install MetaMask or another EVM wallet extension.");
    this.name = "NoWalletError";
  }
}

export class WalletRejectedError extends Error {
  constructor(cause) {
    super("Wallet connection was rejected.");
    this.name = "WalletRejectedError";
    this.cause = cause;
  }
}

// --- Internal state -----------------------------------------------------

let browserProvider = null; // ethers.BrowserProvider, created once per session
let circleAdapter = null;   // lazily created, cached

function getEip1193Provider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new NoWalletError();
  }
  return window.ethereum;
}

// --- Connection -----------------------------------------------------------

/**
 * Prompts the wallet's connect UI and returns the connected address.
 * Does NOT switch networks — call ensureArcTestnet() separately so the
 * caller can decide when/how to prompt for a network switch.
 *
 * @returns {Promise<{ address: string, chainId: number }>}
 */
export async function connectWallet() {
  const injected = getEip1193Provider();

  browserProvider = new BrowserProvider(injected);

  let accounts;
  try {
    accounts = await browserProvider.send("eth_requestAccounts", []);
  } catch (err) {
    // EIP-1193 user-rejected-request error code is 4001
    if (err?.code === 4001) {
      throw new WalletRejectedError(err);
    }
    throw err;
  }

  if (!accounts || accounts.length === 0) {
    throw new WalletRejectedError();
  }

  const network = await browserProvider.getNetwork();

  return {
    address: accounts[0],
    chainId: Number(network.chainId),
  };
}

/**
 * Injected wallets (MetaMask etc.) don't support a real programmatic
 * disconnect over EIP-1193 — there's no "revoke" RPC call a dapp can make.
 * This clears the app's local connection state; the wallet extension
 * itself stays connected until the user disconnects it from the wallet UI.
 */
export function disconnectWallet() {
  browserProvider = null;
  circleAdapter = null;
}

export function isConnected() {
  return browserProvider !== null;
}

// --- Network detection / switching -----------------------------------------

/**
 * Returns the currently connected chain ID (number), or null if not connected.
 */
export async function getCurrentChainId() {
  if (!browserProvider) return null;
  const network = await browserProvider.getNetwork();
  return Number(network.chainId);
}

export async function isOnArcTestnet() {
  const chainId = await getCurrentChainId();
  return chainId === ARC_TESTNET.chainId;
}

/**
 * Prompts the wallet to switch to Arc Testnet. If the wallet doesn't have
 * Arc Testnet configured yet (error code 4902), falls back to
 * wallet_addEthereumChain using the params from config/arc.js.
 */
export async function switchToArcTestnet() {
  const injected = getEip1193Provider();

  try {
    await injected.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET.chainIdHex }],
    });
  } catch (err) {
    if (err?.code === 4902) {
      await injected.request({
        method: "wallet_addEthereumChain",
        params: [ARC_TESTNET_WALLET_PARAMS],
      });
    } else if (err?.code === 4001) {
      throw new WalletRejectedError(err);
    } else {
      throw err;
    }
  }
}

// --- Event listeners (account / network changes) ---------------------------

/**
 * Subscribes to accountsChanged and chainChanged. Returns an unsubscribe
 * function. Call this once after connecting so the UI can react to the
 * user switching accounts or networks from inside the wallet extension.
 *
 * @param {{ onAccountsChanged?: (accounts: string[]) => void,
 *           onChainChanged?: (chainId: number) => void }} handlers
 */
export function subscribeToWalletEvents({ onAccountsChanged, onChainChanged } = {}) {
  let injected;

  try {
    injected = getEip1193Provider();
  } catch {
    return () => {};
  }

  const handleAccountsChanged = (accounts) => {
    circleAdapter = null;

    if (accounts.length === 0) {
      // User disconnected all accounts from the wallet UI.
      disconnectWallet();
    }

    onAccountsChanged?.(accounts);
  };

  const handleChainChanged = (chainIdHex) => {
    circleAdapter = null;
    onChainChanged?.(Number(chainIdHex));
  };

  injected.on?.("accountsChanged", handleAccountsChanged);
  injected.on?.("chainChanged", handleChainChanged);

  return () => {
    injected.removeListener?.("accountsChanged", handleAccountsChanged);
    injected.removeListener?.("chainChanged", handleChainChanged);
  };
}

// --- Signer access for direct contract calls (balances, approvals, etc) ----

/**
 * @returns {Promise<import("ethers").JsonRpcSigner>}
 */
export async function getSigner() {
  if (!browserProvider) {
    throw new Error("Wallet not connected. Call connectWallet() first.");
  }
  return browserProvider.getSigner();
}

export function getProvider() {
  if (!browserProvider) {
    throw new Error("Wallet not connected. Call connectWallet() first.");
  }
  return browserProvider;
}

// --- Circle Ethers v6 adapter (for App Kit / Swap Kit calls) ---------------

/**
 * Lazily creates and caches the Circle Ethers v6 adapter, bound to the
 * connected browser wallet. Use this when calling kit.swap / kit.estimateSwap
 * — don't use it for plain balance reads or non-swap contract calls,
 * those can go through getSigner()/getProvider() directly.
 */
export async function getCircleAdapter() {
  if (!browserProvider) {
    throw new Error("Wallet not connected. Call connectWallet() first.");
  }
  if (!circleAdapter) {
    const injected = getEip1193Provider();
    circleAdapter = await createEthersAdapterFromProvider({
      provider: injected,
    });
  }
  return circleAdapter;
}