import { useState } from 'react';
import Header from './components/Header';
import FxSwapCard from './components/FxSwapCard';
import SettlementHistory from './components/SettlementHistory';
import FxMarketPanel from './components/FxMarketPanel';
import FxChartCard from './components/FxChartCard';
import { useArcWallet } from './hooks/useArcWallet';
import { useTokenBalances } from './hooks/useTokenBalances';

function BalanceCard({
  label,
  value,
  badge,
  badgeClass,
  icon,
  isLoading,
}) {
  return (
    <div className="panel panel-hover p-3.5 sm:p-4 md:p-5 flex items-center justify-between gap-3 sm:gap-4 min-w-0">

      {/* =========================================================
          LEFT SIDE
      ========================================================== */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 md:gap-4 min-w-0">

        {/* Balance Icon */}
        <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl bg-arc-accentSoft border border-arc-border flex items-center justify-center">
          <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5 flex items-center justify-center">
            {icon}
          </div>
        </div>

        {/* Balance Information */}
        <div className="min-w-0">

          {/* Label */}
          <p className="label-mono text-[9px] sm:text-[10px] md:text-xs truncate">
            {label}
          </p>

          {/* Balance / Loading State */}
          {isLoading ? (
            <div className="skeleton h-6 sm:h-7 w-24 sm:w-28 md:w-32 mt-1.5" />
          ) : (
            <p className="value-display text-[20px] sm:text-[23px] md:text-[26px] leading-6 sm:leading-7 md:leading-8 mt-1 truncate">
              {value}
            </p>
          )}

        </div>
      </div>

      {/* =========================================================
          BALANCE TYPE BADGE
      ========================================================== */}
      <span
        className={`shrink-0 text-[8px] sm:text-[9px] md:text-[10px] font-mono font-semibold uppercase tracking-wide sm:tracking-wider px-2 sm:px-2.5 py-1 sm:py-1 rounded-md border ${badgeClass}`}
      >
        {badge}
      </span>
    </div>
  );
}

export default function App() {
  const wallet = useArcWallet();

  const {
    balances,
    refetchBalances,
    isLoading,
  } = useTokenBalances(wallet.account);

  const [transactions, setTransactions] = useState([]);

  const handleSwapSuccess = (txData) => {
    refetchBalances();

    if (txData) {
      setTransactions((prev) => [txData, ...prev]);
    }
  };

  return (
    <div className="min-h-screen app-canvas text-arc-textBright antialiased">

      {/* =========================================================
          HEADER
      ========================================================== */}
      <Header wallet={wallet} />

      {/* =========================================================
          MAIN DASHBOARD
      ========================================================== */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-6 md:py-8 space-y-5 sm:space-y-6">

        {/* =======================================================
            BALANCES SUMMARY
        ======================================================== */}
        {wallet.account && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">

            {/* USDC Balance */}
            <BalanceCard
              label="Arc Testnet · USDC Balance"
              value={`${balances.USDC} USDC`}
              badge="Native Gas"
              badgeClass="bg-arc-accentSoft text-arc-accent border-arc-accent/25"
              isLoading={isLoading}
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-arc-accent"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M8.5 12h7M12 8.5v7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              }
            />

            {/* EURC Balance */}
            <BalanceCard
              label="Arc Testnet · EURC Balance"
              value={`${balances.EURC} EURC`}
              badge="Stablecoin"
              badgeClass="bg-arc-green/10 text-arc-green border-arc-green/25"
              isLoading={isLoading}
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-arc-green"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M9 9.5h6M9 12h6M9 14.5h4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              }
            />

          </div>
        )}

        {/* =======================================================
            DASHBOARD GRID
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">

          {/* =====================================================
              MAIN CONTENT
          ====================================================== */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">

            {/* FX Swap */}
            <FxSwapCard
              wallet={wallet}
              balances={balances}
              onSwapSuccess={handleSwapSuccess}
            />

            {/* FX Chart */}
            <FxChartCard wallet={wallet} />

            {/* Settlement History */}
            <SettlementHistory transactions={transactions} />

          </div>

          {/* =====================================================
              MARKET PANEL
          ====================================================== */}
          <div className="lg:col-span-1 lg:sticky lg:top-6">

            <FxMarketPanel wallet={wallet} />

          </div>

        </div>

      </main>
    </div>
  );
}