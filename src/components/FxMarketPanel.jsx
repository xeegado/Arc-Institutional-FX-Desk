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

  // ================================================================
  // REAL ON-CHAIN RATE
  // ================================================================

  const fetchRate = useCallback(async () => {
    setIsLoadingRate(true);
    setRateError(null);

    try {
      const result = await getQuote({
        tokenIn: 'USDC',
        tokenOut: 'EURC',
        amountIn: '1',
      });

      const amount = Number(result?.estimatedOutput?.amount);

      if (!Number.isFinite(amount)) {
        throw new Error('invalid quote');
      }

      setRate(amount);
      setLastUpdated(new Date());
    } catch (err) {
      setRateError(
        err?.code === 'route_unavailable'
          ? 'No route available (thin testnet liquidity)'
          : 'Live rate unavailable'
      );
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  // ================================================================
  // ECB EUR/USD REFERENCE
  // ================================================================

  const fetchFxReference = useCallback(async () => {
    try {
      const ref = await getEurUsdReference();

      if (
        !ref ||
        !Number.isFinite(ref.rate) ||
        !Number.isFinite(ref.changePct)
      ) {
        throw new Error('invalid reference data');
      }

      setFxRef(ref);
      setFxRefError(null);
    } catch (err) {
      setFxRef(null);
      setFxRefError('EUR/USD reference unavailable');
    }
  }, []);

  // ================================================================
  // LIVE RATE POLLING
  // ================================================================

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

  // ================================================================
  // ECB REFERENCE POLLING
  // ================================================================

  useEffect(() => {
    fetchFxReference();

    const id = setInterval(
      fetchFxReference,
      FX_REFERENCE_POLL_MS
    );

    return () => clearInterval(id);
  }, [fetchFxReference]);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">

      {/* ============================================================
          EURC / USDC MARKET
      ============================================================ */}
      <div className="bg-arc-card border border-arc-border rounded-lg p-4 sm:p-5">

        {/* Header */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-arc-border pb-3">

          <h3 className="text-[11px] sm:text-xs font-mono uppercase tracking-wide sm:tracking-wider text-arc-textBright font-semibold">
            EURC / USDC MARKET
          </h3>

          {canFetchLiveRate ? (
            <span className="self-start sm:self-auto text-[9px] sm:text-[10px] font-mono text-arc-green bg-arc-green/10 px-2 py-1 sm:py-0.5 rounded border border-arc-green/20 whitespace-nowrap">
              LIVE — APP KIT
            </span>
          ) : (
            <span className="self-start sm:self-auto text-[9px] sm:text-[10px] font-mono text-arc-textMuted bg-arc-bg px-2 py-1 sm:py-0.5 rounded border border-arc-border leading-relaxed">
              CONNECT WALLET FOR LIVE RATE
            </span>
          )}
        </div>

        {/* ==========================================================
            MARKET METRICS
        =========================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 text-[10px] sm:text-xs font-mono mb-4">

          {/* Spot Rate */}
          <div className="bg-arc-bg p-3 sm:p-3.5 rounded-lg border border-arc-border min-w-0">

            <span className="text-arc-textMuted block mb-1.5 text-[9px] sm:text-[10px] leading-relaxed">
              SPOT RATE (1 USDC)
            </span>

            <span className="text-base sm:text-lg font-bold text-arc-textBright break-words">
              {!canFetchLiveRate
                ? '—'
                : rate === null && (isLoadingRate || !rateError)
                  ? 'Loading…'
                  : rateError
                    ? 'Unavailable'
                    : `${rate?.toFixed(4) ?? '—'} EURC`}
            </span>
          </div>

          {/* ECB Reference */}
          <div className="bg-arc-bg p-3 sm:p-3.5 rounded-lg border border-arc-border min-w-0">

            <span className="text-arc-textMuted block mb-1.5 text-[9px] sm:text-[10px] leading-relaxed">
              EUR/USD REF (ECB)
            </span>

            {fxRefError ? (
              <span className="text-arc-textMuted text-[10px] sm:text-xs leading-relaxed break-words">
                {fxRefError}
              </span>
            ) : fxRef ? (
              <span
                className={`text-base sm:text-lg font-bold break-words ${
                  fxRef.changePct >= 0
                    ? 'text-arc-green'
                    : 'text-arc-red'
                }`}
              >
                {fxRef.rate?.toFixed(4) ?? '—'}{' '}
                <span className="text-[10px] sm:text-xs font-normal">
                  (
                  {fxRef.changePct >= 0 ? '+' : ''}
                  {fxRef.changePct?.toFixed(2) ?? '0.00'}
                  %)
                </span>
              </span>
            ) : (
              <span className="text-arc-textMuted text-[10px] sm:text-xs">
                Loading…
              </span>
            )}
          </div>
        </div>

        {/* Live Rate Error */}
        {rateError && (
          <div className="mb-3 text-[10px] sm:text-xs font-mono text-arc-red leading-relaxed break-words">
            {rateError}
          </div>
        )}

        {/* ==========================================================
            MARKET METADATA
        =========================================================== */}
        <div className="space-y-2.5 text-[10px] sm:text-xs font-mono border-t border-arc-border pt-3">

          {/* Quote Source */}
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

            <span className="text-arc-textMuted shrink-0">
              ON-CHAIN QUOTE SOURCE
            </span>

            <span className="text-arc-textBright text-left sm:text-right break-words">
              {canFetchLiveRate
                ? 'Arc App Kit — estimateSwap'
                : 'Not connected'}
            </span>
          </div>

          {/* Last Updated */}
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

            <span className="text-arc-textMuted shrink-0">
              ON-CHAIN LAST UPDATED
            </span>

            <span className="text-arc-textBright text-left sm:text-right">
              {lastUpdated
                ? lastUpdated.toLocaleTimeString()
                : '—'}
            </span>
          </div>

          {/* ECB Reference Date */}
          {fxRef && (
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

              <span className="text-arc-textMuted shrink-0">
                EUR/USD REF DATE
              </span>

              <span className="text-arc-textBright text-left sm:text-right break-words">
                {fxRef.date} (vs {fxRef.previousDate})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          ARC NETWORK
      ============================================================ */}
      <div className="bg-arc-card border border-arc-border rounded-lg p-4 sm:p-5">

        <h3 className="text-[11px] sm:text-xs font-mono uppercase tracking-wide sm:tracking-wider text-arc-textBright font-semibold mb-4 border-b border-arc-border pb-3">
          ARC NETWORK
        </h3>

        <div className="space-y-2.5 text-[10px] sm:text-xs font-mono">

          {/* Network */}
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

            <span className="text-arc-textMuted shrink-0">
              NETWORK
            </span>

            <span className="text-arc-textBright font-bold text-left sm:text-right break-words">
              {ARC_TESTNET.chainName}
            </span>
          </div>

          {/* Chain ID */}
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

            <span className="text-arc-textMuted shrink-0">
              CHAIN ID
            </span>

            <span className="text-arc-textBright text-left sm:text-right break-words">
              {ARC_TESTNET.chainId}
            </span>
          </div>

          {/* Native Gas Token */}
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

            <span className="text-arc-textMuted shrink-0">
              NATIVE GAS TOKEN
            </span>

            <span className="text-arc-accent font-bold text-left sm:text-right">
              USDC
            </span>
          </div>

          {/* Finality */}
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

            <span className="text-arc-textMuted shrink-0">
              FINALITY
            </span>

            <span className="text-arc-green text-left sm:text-right break-words">
              Sub-second (per Arc network docs)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}