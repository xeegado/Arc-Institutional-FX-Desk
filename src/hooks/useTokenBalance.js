// src/hooks/useTokenBalances.js
// Owns the balance fetch lifecycle for the connected account:
//   - Fetches real USDC/EURC balances as soon as `account` is set
//     (this was the missing piece — previously balances only loaded
//     after the user's first swap, never on initial connect)
//   - Re-fetches automatically if `account` changes (wallet switches accounts)
//   - Exposes refetchBalances() for post-swap refresh (App.jsx already
//     calls this from handleSwapSuccess)
//
// Normalizes services/balances.js's { usdc: { formatted }, eurc: { formatted } }
// output into the { USDC: "12.34", EURC: "5.67" } display shape App.jsx,
// FxSwapCard, and the balances summary banner all read directly.

import { useCallback, useEffect, useState } from 'react';
import { getBalances } from '../services/balances.js';

const ZERO_BALANCES = { USDC: '0.0', EURC: '0.0' };

export function useTokenBalances(account) {
  const [balances, setBalances] = useState(ZERO_BALANCES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetchBalances = useCallback(async () => {
    if (!account) {
      setBalances(ZERO_BALANCES);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fresh = await getBalances(account);
      setBalances({
        USDC: fresh.usdc.formatted,
        EURC: fresh.eurc.formatted,
      });
    } catch (err) {
      console.error('useTokenBalances: failed to fetch balances', err);
      setError(err.message ?? String(err));
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  // Load balances as soon as an account is connected, and again whenever
  // the connected account changes (e.g. user switches accounts in-wallet).
  useEffect(() => {
    refetchBalances();
  }, [refetchBalances]);

  return { balances, isLoading, error, refetchBalances };
}