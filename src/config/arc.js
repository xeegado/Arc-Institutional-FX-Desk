// src/config/arc.js
// Arc Testnet network configuration
// Source: https://docs.arc.network/arc/references/rpc-endpoints
// Verified via web search on 2026-09-11 — do not hand-edit without re-checking docs.arc.network

export const ARC_TESTNET = {
  chainId: 5042002,
  chainIdHex: "0x4CEF52",
  chainName: "Arc Testnet",
  rpcUrls: {
    primary: "https://rpc.testnet.arc.network",   // Circle-hosted
    wss: "wss://rpc.testnet.arc.network",
    // Fallback/production node providers (Arc docs list these as alternatives
    // to the public Circle endpoint if you hit rate limits):
    blockdaemon: "https://rpc.blockdaemon.testnet.arc.network",
    drpc: "https://rpc.drpc.testnet.arc.network",
    quicknode: "https://rpc.quicknode.testnet.arc.network",
  },
  // IMPORTANT — Arc's native USDC has TWO interfaces with DIFFERENT decimals:
  //   - Native gas token (eth_getBalance, tx value, wallet_addEthereumChain
  //     nativeCurrency.decimals): 18 decimals
  //   - Optional ERC-20 interface (balanceOf, transfer, approve): 6 decimals
  // Arc's own docs recommend relying solely on the ERC-20 interface for app
  // balance reads to avoid mixing the two. See tokens.usdc / tokens.eurc
  // below for the ERC-20 addresses + decimals used by the balances service.
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18, // native precision, required by EIP-3085 wallet_addEthereumChain
  },
  // ERC-20 token contracts on Arc Testnet.
  // Source: https://docs.arc.io/arc/references/contract-addresses
  tokens: {
    usdc: {
      address: "0x3600000000000000000000000000000000000000",
      symbol: "USDC",
      decimals: 6, // ERC-20 interface decimals — NOT the native 18
      note: "Optional ERC-20 interface over the native USDC balance. No separate wrapped token — same underlying balance as native.",
    },
    eurc: {
      address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
      symbol: "EURC",
      decimals: 6,
    },
  },
  blockExplorer: {
    url: "https://testnet.arcscan.app",
    gasTracker: "https://testnet.arcscan.app/gas-tracker",
  },
  faucet: "https://faucet.circle.com", // select "Arc Testnet"
};

// Convenience export in the shape MetaMask's wallet_addEthereumChain expects
export const ARC_TESTNET_WALLET_PARAMS = {
  chainId: ARC_TESTNET.chainIdHex,
  chainName: ARC_TESTNET.chainName,
  nativeCurrency: ARC_TESTNET.nativeCurrency,
  rpcUrls: [ARC_TESTNET.rpcUrls.primary],
  blockExplorerUrls: [ARC_TESTNET.blockExplorer.url],
};