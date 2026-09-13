import { useState, useEffect, useCallback } from 'react';
import { getEurUsdHistory } from '../services/fxMarketData';
import { getQuote } from '../services/swap';

const TIMEFRAMES = ['1H', '1D', '1W', '1M'];
const SESSION_POLL_MS = 30000; // matches FxMarketPanel's live-rate poll cadence
const MAX_SESSION_POINTS = 500; // rolling cap so the buffer can't grow unbounded over a long session

// 1W/1M use real ECB daily reference rates (ONLY genuinely available
// historical source without a paid data provider — see fxMarketData.js).
// 1H/1D have NO free real historical source at all, so instead of faking
// one, this component builds a real live series client-side from App
// Kit's actual on-chain quotes as the session runs. That series starts
// empty on page load and only has real points from "now" onward — it is
// not backfilled with anything invented.
export default function FxChartCard({ wallet }) {
  const { account, isCorrectNetwork } = wallet ?? {};
  const canPollOnChain = Boolean(account && isCorrectNetwork);

  const [timeframe, setTimeframe] = useState('1D');

  const [weeklyHistory, setWeeklyHistory] = useState(null);
  const [monthlyHistory, setMonthlyHistory] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  const [sessionPoints, setSessionPoints] = useState([]); // [{ t: Date, rate: number }]

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

  // Build a real live session series from actual on-chain quotes.
  useEffect(() => {
    if (!canPollOnChain) return undefined;

    let cancelled = false;
    const poll = async () => {
      try {
        const result = await getQuote({ tokenIn: 'USDC', tokenOut: 'EURC', amountIn: '1' });
        if (cancelled) return;
        setSessionPoints((prev) =>
          [...prev, { t: new Date(), rate: Number(result.estimatedOutput.amount) }].slice(-MAX_SESSION_POINTS)
        );
      } catch {
        // Skip a failed poll silently — one transient error (e.g. thin
        // testnet liquidity) shouldn't break the accumulating series.
      }
    };

    poll();
    const id = setInterval(poll, SESSION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [canPollOnChain]);

  const series = buildSeries({ timeframe, weeklyHistory, monthlyHistory, sessionPoints, historyError });

  return (
    <div className="bg-arc-card border border-arc-border rounded-lg p-5">
      {/* Chart Header Controls */}
      <div className="flex justify-between items-center mb-4 border-b border-arc-border pb-3">
        <div className="flex items-center space-x-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-arc-textBright font-semibold">
            EURC / USDC MARKET CHART
          </h3>
          <span className="text-[10px] font-mono text-arc-textMuted bg-arc-bg px-2 py-0.5 rounded border border-arc-border">
            {series.badge}
          </span>
        </div>

        {/* Timeframe Selectors */}
        <div className="flex space-x-1 font-mono text-xs">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded transition-colors ${
                timeframe === tf
                  ? 'bg-arc-accent text-white font-bold'
                  : 'text-arc-textMuted hover:text-arc-textBright bg-arc-bg'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart body */}
      <div className="h-44 w-full flex items-end justify-between space-x-1 pt-4 pb-2 px-2 bg-arc-bg/40 rounded border border-arc-border/40">
        {series.status === 'empty' ? (
          <div className="w-full h-full flex items-center justify-center text-center text-xs font-mono text-arc-textMuted px-6">
            {series.emptyMessage}
          </div>
        ) : (
          series.points.map((p, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-arc-card text-arc-green text-[10px] font-mono px-1.5 py-0.5 rounded border border-arc-border transition-opacity whitespace-nowrap pointer-events-none z-20">
                {p.rate.toFixed(4)}
              </div>
              <div
                style={{ height: `${p.heightPct}%` }}
                className="w-full bg-arc-accent/30 group-hover:bg-arc-accent border-t-2 border-arc-accent transition-all rounded-t-sm"
              />
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between text-[10px] font-mono text-arc-textMuted mt-3 px-1">
        <span>{series.startLabel}</span>
        <span>{series.endLabel}</span>
      </div>
    </div>
  );
}

function scaleToHeights(points) {
  const rates = points.map((p) => p.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min || rate_fallback(min);
  return points.map((p) => ({
    ...p,
    heightPct: 15 + ((p.rate - min) / range) * 80, // keep bars visible even when the series is nearly flat
  }));
}

// Guards against a divide-by-near-zero when every point in the window is
// identical (e.g. a single-day EUR/USD window with one data point, or a
// perfectly flat on-chain rate) — falls back to a small nominal range
// rather than NaN heights.
function rate_fallback(min) {
  return Math.max(Math.abs(min) * 0.0001, 0.0001);
}

function buildSeries({ timeframe, weeklyHistory, monthlyHistory, sessionPoints, historyError }) {
  if (timeframe === '1W' || timeframe === '1M') {
    const raw = timeframe === '1W' ? weeklyHistory : monthlyHistory;

    if (historyError) {
      return { status: 'empty', emptyMessage: historyError, badge: 'EUR/USD REF (ECB)', startLabel: '—', endLabel: '—' };
    }
    if (!raw) {
      return { status: 'empty', emptyMessage: 'Loading EUR/USD history…', badge: 'EUR/USD REF (ECB)', startLabel: '—', endLabel: '—' };
    }
    if (raw.length === 0) {
      return { status: 'empty', emptyMessage: 'No EUR/USD data returned for this range', badge: 'EUR/USD REF (ECB)', startLabel: '—', endLabel: '—' };
    }

    return {
      status: 'ok',
      points: scaleToHeights(raw),
      badge: 'EUR/USD REF (ECB) — proxy, not on-chain rate',
      startLabel: raw[0].date,
      endLabel: raw[raw.length - 1].date,
    };
  }

  // 1H / 1D — real live session series from on-chain App Kit quotes.
  if (sessionPoints.length === 0) {
    return {
      status: 'empty',
      emptyMessage: 'Connect your wallet to start a live on-chain rate history — no historical intraday data source exists for this pair',
      badge: 'LIVE SESSION — APP KIT',
      startLabel: '—',
      endLabel: 'NOW',
    };
  }

  const windowMs = timeframe === '1H' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - windowMs;
  const windowed = sessionPoints.filter((p) => p.t.getTime() >= cutoff);

  if (windowed.length === 0) {
    return {
      status: 'empty',
      emptyMessage: 'No points collected in this window yet — check back shortly',
      badge: 'LIVE SESSION — APP KIT',
      startLabel: '—',
      endLabel: 'NOW',
    };
  }

  return {
    status: 'ok',
    points: scaleToHeights(windowed),
    badge: 'LIVE SESSION — APP KIT (since connect, not true 24h history)',
    startLabel: windowed[0].t.toLocaleTimeString(),
    endLabel: 'NOW',
  };
}