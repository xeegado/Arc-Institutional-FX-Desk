// src/hooks/useWallet.js
// Bridges services/wallet.js (plain functions) into React state, in the
// shape FxSwapCard/Header already expect: { account, isCorrectNetwork,
// connectWallet, disconnectWallet, switchToArcTestnet, isConnecting }.

import { useCallback, useEffect, useState } from "react";
import {
  connectWallet as connectWalletService,
  disconnectWallet as disconnectWalletService,
  switchToArcTestnet as switchToArcTestnetService,
  isOnArcTestnet,
  subscribeToWalletEvents,
} from "../services/wallet.js";
import { ARC_TESTNET } from "../config/arc.js";

export function useArcWallet() {
  const [account, setAccount] = useState(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { address, chainId } = await connectWalletService();
      setAccount(address);
      setIsCorrectNetwork(chainId === ARC_TESTNET.chainId);
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    disconnectWalletService();
    setAccount(null);
    setIsCorrectNetwork(false);
  }, []);

  const switchToArcTestnet = useCallback(async () => {
    setError(null);
    try {
      await switchToArcTestnetService();
      const onArc = await isOnArcTestnet();
      setIsCorrectNetwork(onArc);
    } catch (err) {
      setError(err.message ?? String(err));
    }
  }, []);

  // React to account/network changes made from inside the wallet extension
  // itself (not triggered by this app's own buttons).
  useEffect(() => {
    if (!account) return undefined;

    const unsubscribe = subscribeToWalletEvents({
      onAccountsChanged: (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          setIsCorrectNetwork(false);
        } else {
          setAccount(accounts[0]);
        }
      },
      onChainChanged: (chainId) => {
        setIsCorrectNetwork(chainId === ARC_TESTNET.chainId);
      },
    });

    return unsubscribe;
  }, [account]);

  return {
    account,
    isCorrectNetwork,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchToArcTestnet,
  };
}