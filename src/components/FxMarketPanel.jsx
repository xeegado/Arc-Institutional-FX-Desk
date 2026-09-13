import React, { useCallback, useEffect, useState } from 'react';
import { getQuote } from '../services/swap';
import { getEurUsdReference } from '../services/fxMarketData';
import { ARC_TESTNET } from '../config/arc';

const RATE_POLL_MS = 30000;
const FX_REFERENCE_POLL_MS = 15 * 60 * 1000;

export default function FxMarketPanel({ wallet }) {
  const { account, isCorrectNetwork } = wallet ?? {};
  const canFetchLiveRate = Boolean(account && isCorrectNetwork);

  const [rate, setRate] = useState(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [rateError, setRateError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [fxRef, setFxRef] = useState(null);
  const [fxRefError, setFxRefError] = useState(null);

  const fetchRate = useCallback(async () => {
    setIsLoadingRate(true);
    setRateError(null);
    try {
      const result = await getQuote({ tokenIn: 'USDC', tokenOut: 'EURC', amountIn: '1' });
      const amount = Number(result?.estimatedOutput?.amount); // ← FIX
      if (!Number.isFinite(amount)) throw new Error('invalid quote'); // ← FIX
      setRate(amount);
      setLastUpdated(new Date());
    } catch (err) {
      setRateError(err?.code === 'route_unavailable'
        ? 'No route available (thin testnet liquidity)'
        : 'Live rate unavailable');
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  const fetchFxReference = useCallback(async () => {
    try {
      const ref = await getEurUsdReference();
      // ← FIX: validate the payload, don't trust shape
      if (!ref || !Number.isFinite(ref.rate) || !Number.isFinite(ref.changePct)) {
        throw new Error('invalid reference data');
      }
      setFxRef(ref);
      setFxRefError(null);
    } catch (err) {
      setFxRef(null); // ← FIX: clear stale/invalid ref
      setFxRefError('EUR/USD reference unavailable');
    }
  }, []);

  useEffect(() => {
    if (!canFetchLiveRate) {
      setRate(null);
      setLastUpdated(null);
      return undefined;
    }
    fetchRate();
    const id = setInterval(fetchRate, RATE_POLL_MS);
    return () => clearInterval(id);
  }, [canFetchLiveRate, fetchRate]);

  useEffect(() => {
    fetchFxReference();
    const id = setInterval(fetchFxReference, FX_REFERENCE_POLL_MS);
    return () => clearInterval(id);
  }, [fetchFxReference]);

  return (
    <div className="space-y-6">
      <div className="bg-arc-card border border-arc-border rounded-lg p-5">
        <div className="flex justify-between items-center mb-4 border-b border-arc-border pb-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-arc-textBright font-semibold">
            EURC / USDC MARKET
          </h3>
          {canFetchLiveRate ? (
            <span className="text-[10px] font-mono text-arc-green bg-arc-green/10 px-2 py-0.5 rounded border border-arc-green/20">
              LIVE — APP KIT
            </span>
          ) : (
            <span className="text-[10px] font-mono text-arc-textMuted bg-arc-bg px-2 py-0.5 rounded border border-arc-border">
              CONNECT WALLET FOR LIVE RATE
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-4">
          <div className="bg-arc-bg p-3 rounded border border-arc-border">
            <span className="text-arc-textMuted block mb-1">SPOT RATE (1 USDC)</span>
            <span className="text-lg font-bold text-arc-textBright">
              {!canFetchLiveRate
                ? '—'
                : rate === null && (isLoadingRate || !rateError)   // ← FIX: check rate first
                ? 'Loading…'
                : rateError
                ? 'Unavailable'
                : `${rate?.toFixed(4) ?? '—'} EURC`}              {/* ← FIX: optional chain */}
            </span>
          </div>
          <div className="bg-arc-bg p-3 rounded border border-arc-border">
            <span className="text-arc-textMuted block mb-1">EUR/USD REF (ECB)</span>
            {fxRefError ? (
              <span className="text-arc-textMuted text-xs">{fxRefError}</span>
            ) : fxRef ? (
              <span className={`text-lg font-bold ${fxRef.changePct >= 0 ? 'text-arc-green' : 'text-arc-red'}`}>
                {fxRef.rate?.toFixed(4) ?? '—'}{' '}                {/* ← FIX: optional chain */}
                <span className="text-xs font-normal">
                  ({fxRef.changePct >= 0 ? '+' : ''}{fxRef.changePct?.toFixed(2) ?? '0.00'}%)
                </span>
              </span>
            ) : (
              <span className="text-arc-textMuted text-xs">Loading…</span>
            )}
          </div>
        </div>

        {rateError && (
          <div className="mb-3 text-xs font-mono text-arc-red">{rateError}</div>
        )}

        <div className="space-y-2 text-xs font-mono border-t border-arc-border pt-3">
          <div className="flex justify-between text-arc-textMuted">
            <span>ON-CHAIN QUOTE SOURCE</span>
            <span className="text-arc-textBright">
              {canFetchLiveRate ? 'Arc App Kit — estimateSwap' : 'Not connected'}
            </span>
          </div>
          <div className="flex justify-between text-arc-textMuted">
            <span>ON-CHAIN LAST UPDATED</span>
            <span className="text-arc-textBright">
              {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            </span>
          </div>
          {fxRef && (
            <div className="flex justify-between text-arc-textMuted">
              <span>EUR/USD REF DATE</span>
              <span className="text-arc-textBright">{fxRef.date} (vs {fxRef.previousDate})</span>
            </div>
          )}
        </div>
      </div>

      {/* Arc Network Panel — unchanged */}
      <div className="bg-arc-card border border-arc-border rounded-lg p-5">
        <h3 className="text-xs font-mono uppercase tracking-wider text-arc-textBright font-semibold mb-4 border-b border-arc-border pb-3">
          ARC NETWORK
        </h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between text-arc-textMuted">
            <span>NETWORK</span>
            <span className="text-arc-textBright font-bold">{ARC_TESTNET.chainName}</span>
          </div>
          <div className="flex justify-between text-arc-textMuted">
            <span>CHAIN ID</span>
            <span className="text-arc-textBright">{ARC_TESTNET.chainId}</span>
          </div>
          <div className="flex justify-between text-arc-textMuted">
            <span>NATIVE GAS TOKEN</span>
            <span className="text-arc-accent font-bold">USDC</span>
          </div>
          <div className="flex justify-between text-arc-textMuted">
            <span>FINALITY</span>
            <span className="text-arc-green">Sub-second (per Arc network docs)</span>
          </div>
        </div>
      </div>
    </div>
  );
}