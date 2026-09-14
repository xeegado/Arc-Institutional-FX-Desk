// src/hooks/useArcWallet.js
// React hook that connects the UI to services/wallet.js.
//
// This hook handles:
//   1. Manual wallet connection.
//   2. Automatic restoration of an already-authorized wallet after refresh.
//   3. Arc Testnet detection.
//   4. Wallet account/network changes.
//   5. Wallet installation messaging.

import { useCallback, useEffect, useState } from "react";

import {
  connectWallet as connectWalletService,
  restoreWalletConnection,
  disconnectWallet as disconnectWalletService,
  switchToArcTestnet as switchToArcTestnetService,
  isOnArcTestnet,
  subscribeToWalletEvents,
  NoWalletError,
} from "../services/wallet.js";

import { ARC_TESTNET } from "../config/arc.js";

export function useArcWallet() {
  // Currently connected wallet address.
  const [account, setAccount] = useState(null);

  // Whether the wallet is currently connected to Arc Testnet.
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  // Shows loading state while connecting.
  const [isConnecting, setIsConnecting] = useState(false);

  // Stores wallet-related errors.
  const [error, setError] = useState(null);

  // Controls the "Wallet Required" installation dialog.
  const [walletMissing, setWalletMissing] = useState(false);

  // ---------------------------------------------------------
  // Manual wallet connection
  // ---------------------------------------------------------

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setWalletMissing(false);

    try {
      localStorage.removeItem("arc_wallet_disconnected");
      // This intentionally opens MetaMask's connection prompt.
      const { address, chainId } = await connectWalletService();

      setAccount(address);

      setIsCorrectNetwork(chainId === ARC_TESTNET.chainId);
    } catch (err) {
      // No wallet extension/app was detected.
      if (err instanceof NoWalletError) {
        setWalletMissing(true);
        return;
      }

      // Display other wallet errors.
      setError(err.message ?? String(err));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ---------------------------------------------------------
  // Close wallet installation dialog
  // ---------------------------------------------------------

  const closeWalletMissing = useCallback(() => {
    setWalletMissing(false);
  }, []);

  // ---------------------------------------------------------
  // Disconnect wallet from the application
  // ---------------------------------------------------------

const disconnectWallet = useCallback(() => {
  // Remember that the user intentionally disconnected.
  localStorage.setItem("arc_wallet_disconnected", "true");

  // Clear the wallet connection from the application.
  disconnectWalletService();

  // Clear the wallet information from the React state.
  setAccount(null);
  setIsCorrectNetwork(false);
}, []);

  // ---------------------------------------------------------
  // Switch to Arc Testnet
  // ---------------------------------------------------------

  const switchToArcTestnet = useCallback(async () => {
    setError(null);

    try {
      // Ask MetaMask to switch/add Arc Testnet.
      await switchToArcTestnetService();

      // Confirm the wallet is now actually on Arc Testnet.
      const onArc = await isOnArcTestnet();

      setIsCorrectNetwork(onArc);
    } catch (err) {
      setError(err.message ?? String(err));
    }
  }, []);

  // ---------------------------------------------------------
  // Restore wallet after page refresh
  // ---------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const restoreConnection = async () => {
          const intentionallyDisconnected =
        localStorage.getItem("arc_wallet_disconnected") === "true";

      // If the user intentionally disconnected, do not restore
      // the wallet automatically after a page refresh.
      if (intentionallyDisconnected) {
        return;
      }

  await new Promise((resolve) => setTimeout(resolve, 300));
      // Try several times in case MetaMask is still initializing.
      for (let attempt = 1; attempt <= 5; attempt++) {
        // Stop immediately if this React component was unmounted.
        if (cancelled) {
          return;
        }

        try {
          // Check for an already-authorized wallet silently.
          //
          // This does NOT open the MetaMask connection popup.
          const restored = await restoreWalletConnection();

          // If MetaMask returned an authorized account,
          // restore it into React state.
          if (restored) {
            if (!cancelled) {
              setAccount(restored.address);

              setIsCorrectNetwork(
                restored.chainId === ARC_TESTNET.chainId
              );
            }

            return;
          }
        } catch (err) {
          // MetaMask may still be initializing.
          // Log the attempt so we can diagnose the problem if necessary.
          console.warn(
            `Wallet restoration attempt ${attempt} failed:`,
            err
          );
        }

        // Wait before trying again.
        if (attempt < 5) {
          await new Promise((resolve) =>
            setTimeout(resolve, 500)
          );
        }
      }

      // If all attempts fail, leave the wallet disconnected.
      // The user can still manually click CONNECT WALLET.
    };

    restoreConnection();

    // Prevent state updates if the component unmounts while
    // the asynchronous restore operation is still running.
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------
  // React to MetaMask account/network changes
  // ---------------------------------------------------------

  useEffect(() => {
    if (!account) return undefined;

    const unsubscribe = subscribeToWalletEvents({
      // User changed the selected MetaMask account.
      onAccountsChanged: (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          setIsCorrectNetwork(false);
        } else {
          setAccount(accounts[0]);
        }
      },

      // User changed the network inside MetaMask.
      onChainChanged: (chainId) => {
        setIsCorrectNetwork(
          chainId === ARC_TESTNET.chainId
        );
      },
    });

    return unsubscribe;
  }, [account]);

  // ---------------------------------------------------------
  // Public hook API
  // ---------------------------------------------------------

  return {
    account,
    isCorrectNetwork,
    isConnecting,
    error,
    walletMissing,
    closeWalletMissing,
    connectWallet,
    disconnectWallet,
    switchToArcTestnet,
  };
}