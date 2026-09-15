import { useState, useEffect, useCallback } from 'react';
import { getEurUsdHistory } from '../services/fxMarketData';
import { getQuote } from '../services/swap';

const TIMEFRAMES = ['1H', '1D', '1W', '1M'];

const SESSION_POLL_MS = 30000; // Matches FxMarketPanel's live-rate poll cadence
const MAX_SESSION_POINTS = 500; // Prevents unlimited session growth

// Maximum number of bars rendered visually.
// The underlying sessionPoints array still keeps up to 500 real points.
// This only prevents hundreds of extremely thin bars from becoming
// unreadable on the screen.
const MAX_VISIBLE_POINTS = 80;

// 1W/1M use real ECB daily reference rates.
// 1H/1D use real live App Kit on-chain quotes collected during the
// current browser session. No artificial historical values are created.
export default function FxChartCard({ wallet }) {
  const { account, isCorrectNetwork } = wallet ?? {};
  const canPollOnChain = Boolean(account && isCorrectNetwork);

  const [timeframe, setTimeframe] = useState('1D');

  const [weeklyHistory, setWeeklyHistory] = useState(null);
  const [monthlyHistory, setMonthlyHistory] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  // [{ t: Date, rate: number }]
  const [sessionPoints, setSessionPoints] = useState([]);

  // ================================================================
  // LOAD REAL ECB DAILY HISTORY
  // ================================================================

  const loadDailyHistory = useCallback(async () => {
    setHistoryError(null);

    try {
      const [week, month] = await Promise.all([
        getEurUsdHistory(7),
        getEurUsdHistory(30),
      ]);

      setWeeklyHistory(week);
      setMonthlyHistory(month);
    } catch (err) {
      setHistoryError('EUR/USD history unavailable');
    }
  }, []);

  useEffect(() => {
    loadDailyHistory();
  }, [loadDailyHistory]);

  // ================================================================
  // BUILD REAL LIVE ON-CHAIN SESSION SERIES
  // ================================================================

  useEffect(() => {
    if (!canPollOnChain) {
      return undefined;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const result = await getQuote({
          tokenIn: 'USDC',
          tokenOut: 'EURC',
          amountIn: '1',
        });

        if (cancelled) return;

        const rate = Number(result?.estimatedOutput?.amount);

        // Ignore malformed quote responses instead of inserting
        // invalid values into the chart.
        if (!Number.isFinite(rate)) {
          return;
        }

        setSessionPoints((prev) =>
          [
            ...prev,
            {
              t: new Date(),
              rate,
            },
          ].slice(-MAX_SESSION_POINTS)
        );
      } catch {
        // A single failed poll should not destroy the session history.
        // This is particularly useful on testnet where liquidity can
        // temporarily disappear.
      }
    };

    // Get the first real quote immediately.
    poll();

    // Continue collecting real quotes every 30 seconds.
    const id = setInterval(poll, SESSION_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [canPollOnChain]);

  // Build the appropriate series for the selected timeframe.
  const series = buildSeries({
    timeframe,
    weeklyHistory,
    monthlyHistory,
    sessionPoints,
    historyError,
  });

  return (
    <div className="bg-arc-card border border-arc-border rounded-lg p-4 sm:p-5 md:p-6 min-w-0">

      {/* ============================================================
          CHART HEADER
      ============================================================ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-arc-border pb-3 min-w-0">

        {/* Title + data source */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 min-w-0">

          <h3 className="text-[11px] sm:text-xs font-mono uppercase tracking-wide sm:tracking-wider text-arc-textBright font-semibold leading-relaxed">
            EURC / USDC MARKET CHART
          </h3>

          <span className="self-start sm:self-auto max-w-full text-[9px] sm:text-[10px] font-mono text-arc-textMuted bg-arc-bg px-2 py-1 sm:py-0.5 rounded border border-arc-border leading-relaxed break-words">
            {series.badge}
          </span>
        </div>

        {/* ==========================================================
            TIMEFRAME SELECTORS
        =========================================================== */}
        <div
          className="flex items-center gap-1 font-mono text-[10px] sm:text-xs shrink-0"
          role="group"
          aria-label="Chart timeframe"
        >
          {TIMEFRAMES.map((tf) => {
            const isActive = timeframe === tf;

            return (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                aria-pressed={isActive}
                className={`
                  min-w-[38px] sm:min-w-0
                  px-2.5 sm:px-2
                  py-1.5 sm:py-1
                  rounded
                  transition-colors
                  touch-manipulation
                  border
                  ${
                    isActive
                      ? 'bg-arc-accent text-white font-bold border-arc-accent'
                      : 'text-arc-textMuted hover:text-arc-textBright bg-arc-bg border-arc-border'
                  }
                `}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          CHART BODY
      ============================================================ */}
      <div
        className="
          h-40 sm:h-44 md:h-48
          w-full
          min-w-0
          overflow-hidden
          flex items-end justify-between
          gap-0.5 sm:gap-1
          pt-4 pb-2
          px-2
          bg-arc-bg/40
          rounded
          border border-arc-border/40
        "
      >
        {series.status === 'empty' ? (
          <div className="w-full h-full flex items-center justify-center text-center text-[10px] sm:text-xs font-mono text-arc-textMuted px-3 sm:px-6 leading-relaxed">
            {series.emptyMessage}
          </div>
        ) : (
          series.points.map((p, idx) => (
            <div
              key={`${p.t instanceof Date ? p.t.getTime() : p.date ?? idx}-${idx}`}
              className="flex-1 min-w-0 flex flex-col items-center h-full justify-end group relative"
            >
              {/* Desktop hover tooltip */}
              <div className="
                opacity-0
                group-hover:opacity-100
                absolute
                -top-8
                bg-arc-card
                text-arc-green
                text-[10px]
                font-mono
                px-1.5
                py-0.5
                rounded
                border
                border-arc-border
                transition-opacity
                whitespace-nowrap
                pointer-events-none
                z-20
              ">
                {p.rate.toFixed(4)}
              </div>

              {/* Chart bar */}
              <div
                style={{
                  height: `${p.heightPct}%`,
                }}
                className="
                  w-full
                  bg-arc-accent/30
                  group-hover:bg-arc-accent
                  border-t-2
                  border-arc-accent
                  transition-all
                  rounded-t-sm
                "
              />
            </div>
          ))
        )}
      </div>

      {/* ============================================================
          CHART RANGE LABELS
      ============================================================ */}
      <div className="flex justify-between items-start gap-4 text-[9px] sm:text-[10px] font-mono text-arc-textMuted mt-3 px-1">

        <span className="min-w-0 break-words">
          {series.startLabel}
        </span>

        <span className="min-w-0 text-right break-words">
          {series.endLabel}
        </span>
      </div>
    </div>
  );
}

// ====================================================================
// SCALE CHART POINTS INTO VISIBLE BAR HEIGHTS
// ====================================================================

function scaleToHeights(points) {
  const rates = points.map((p) => p.rate);

  const min = Math.min(...rates);
  const max = Math.max(...rates);

  const range = max - min || rateFallback(min);

  return points.map((p) => ({
    ...p,

    // Keep bars visible even when rates are almost identical.
    heightPct:
      15 + ((p.rate - min) / range) * 80,
  }));
}

// ====================================================================
// FALLBACK FOR FLAT / NEAR-ZERO SERIES
// ====================================================================

function rateFallback(min) {
  return Math.max(
    Math.abs(min) * 0.0001,
    0.0001
  );
}

// ====================================================================
// LIMIT VISUAL DENSITY WITHOUT THROWING AWAY SESSION DATA
// ====================================================================
//
// The application can retain up to 500 real points, but displaying
// all 500 bars at once makes the chart unreadable.
//
// This function samples the existing real points for display only.
// It does NOT create, modify, or invent market data.
// ====================================================================

function limitVisiblePoints(points) {
  if (points.length <= MAX_VISIBLE_POINTS) {
    return points;
  }

  const step = (points.length - 1) / (MAX_VISIBLE_POINTS - 1);

  return Array.from(
    { length: MAX_VISIBLE_POINTS },
    (_, index) => {
      const sourceIndex = Math.round(index * step);
      return points[sourceIndex];
    }
  );
}

// ====================================================================
// BUILD THE CORRECT SERIES FOR THE SELECTED TIMEFRAME
// ====================================================================

function buildSeries({
  timeframe,
  weeklyHistory,
  monthlyHistory,
  sessionPoints,
  historyError,
}) {
  // ================================================================
  // 1W / 1M
  // REAL ECB DAILY REFERENCE DATA
  // ================================================================

  if (timeframe === '1W' || timeframe === '1M') {
    const raw =
      timeframe === '1W'
        ? weeklyHistory
        : monthlyHistory;

    if (historyError) {
      return {
        status: 'empty',
        emptyMessage: historyError,
        badge: 'EUR/USD REF (ECB)',
        startLabel: '—',
        endLabel: '—',
      };
    }

    if (!raw) {
      return {
        status: 'empty',
        emptyMessage: 'Loading EUR/USD history…',
        badge: 'EUR/USD REF (ECB)',
        startLabel: '—',
        endLabel: '—',
      };
    }

    if (raw.length === 0) {
      return {
        status: 'empty',
        emptyMessage:
          'No EUR/USD data returned for this range',
        badge: 'EUR/USD REF (ECB)',
        startLabel: '—',
        endLabel: '—',
      };
    }

    const visiblePoints = limitVisiblePoints(raw);

    return {
      status: 'ok',
      points: scaleToHeights(visiblePoints),
      badge: 'EUR/USD REF (ECB) — proxy, not on-chain rate',
      startLabel: raw[0].date,
      endLabel: raw[raw.length - 1].date,
    };
  }

  // ================================================================
  // 1H / 1D
  // REAL LIVE SESSION SERIES FROM APP KIT
  // ================================================================

  if (sessionPoints.length === 0) {
    return {
      status: 'empty',
      emptyMessage:
        'Connect your wallet to start a live on-chain rate history — no historical intraday data source exists for this pair',
      badge: 'LIVE SESSION — APP KIT',
      startLabel: '—',
      endLabel: 'NOW',
    };
  }

  const windowMs =
    timeframe === '1H'
      ? 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

  const cutoff = Date.now() - windowMs;

  const windowed = sessionPoints.filter(
    (p) => p.t.getTime() >= cutoff
  );

  if (windowed.length === 0) {
    return {
      status: 'empty',
      emptyMessage:
        'No points collected in this window yet — check back shortly',
      badge: 'LIVE SESSION — APP KIT',
      startLabel: '—',
      endLabel: 'NOW',
    };
  }

  const visiblePoints = limitVisiblePoints(windowed);

  return {
    status: 'ok',
    points: scaleToHeights(visiblePoints),
    badge:
      'LIVE SESSION — APP KIT (since connect, not true 24h history)',
    startLabel:
      windowed[0].t.toLocaleTimeString(),
    endLabel: 'NOW',
  };
}