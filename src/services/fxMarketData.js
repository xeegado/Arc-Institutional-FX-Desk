// src/services/fxMarketData.js
// Real EUR/USD reference data from Frankfurter (api.frankfurter.dev) — free,
// no API key, CORS-open, ECB-sourced. https://frankfurter.dev
//
// Verified endpoint shapes (corrected 2026-09-12 — an earlier version of
// this file used an incorrect /v2/rate/{base}/{quote} path that doesn't
// exist on the real API):
//   GET /v1/latest?base=EUR&symbols=USD
//     -> { base, date, rates: { USD: number } }
//   GET /v1/{start}..{end}?base=EUR&symbols=USD   (time series)
//     -> { base, start_date, end_date, rates: { "2024-01-02": { USD }, ... } }
//
// Why EUR/USD as a proxy for EURC/USDC:
// EURC and USDC are each 1:1-pegged to their fiat currency, so the ECB's
// EUR/USD reference rate is a legitimate real-world anchor — NOT the same
// number as the on-chain EURC/USDC swap rate from App Kit (services/swap.js),
// which reflects actual testnet pool pricing/slippage and can diverge from
// the fiat reference. Callers should label these separately, not merge them.
//
// Limitation, stated plainly: the ECB publishes ONE rate per business day
// (~16:00 CET), not intraday ticks. There is no true intraday history
// available from this free source — getEurUsdHistory() returns real daily
// points, not synthetic ones, but it cannot answer "what was the rate at
// 3pm today."

const FRANKFURTER_BASE = "https://api.frankfurter.dev/v1";

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Fetches real daily EUR/USD rates over the last `daysBack` calendar days
 * (weekends/holidays simply won't have entries — that's correct ECB
 * behavior, not a bug). Returns points sorted oldest -> newest.
 *
 * @param {number} daysBack
 * @returns {Promise<Array<{ date: string, rate: number }>>}
 */
export async function getEurUsdHistory(daysBack) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);

  const url = `${FRANKFURTER_BASE}/${toIsoDate(start)}..${toIsoDate(end)}?base=EUR&symbols=USD`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Frankfurter time-series request failed: ${res.status}`);
  }
  const data = await res.json();

  return Object.entries(data.rates)
    .map(([date, rates]) => ({ date, rate: rates.USD }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Real latest EUR/USD reference rate plus the prior available business
 * day's rate, with a real day-over-day % change. Pulls an 8-day window so
 * weekends/holidays don't leave us with fewer than two data points.
 *
 * @returns {Promise<{
 *   rate: number, date: string,
 *   previousRate: number, previousDate: string,
 *   changePct: number, source: "ECB via Frankfurter"
 * }>}
 */
export async function getEurUsdReference() {
  const history = await getEurUsdHistory(8);
  if (history.length < 2) {
    throw new Error("Not enough EUR/USD history returned to compute a change");
  }

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const changePct = ((latest.rate - previous.rate) / previous.rate) * 100;

  return {
    rate: latest.rate,
    date: latest.date,
    previousRate: previous.rate,
    previousDate: previous.date,
    changePct,
    source: "ECB via Frankfurter",
  };
}