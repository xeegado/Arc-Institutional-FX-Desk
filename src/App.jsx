import { useState } from 'react';
import Header from './components/Header';
import FxSwapCard from './components/FxSwapCard';
import SettlementHistory from './components/SettlementHistory';
import FxMarketPanel from './components/FxMarketPanel';
import FxChartCard from './components/FxChartCard';
import { useArcWallet } from './hooks/useArcWallet';
import { useTokenBalances } from './hooks/useTokenBalances';

function BalanceCard({ label, value, badge, badgeClass, icon, isLoading }) {
  return (
    <div className="panel panel-hover p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        {/* Icon well */}
        <div className="shrink-0 w-11 h-11 rounded-xl bg-arc-accentSoft border border-arc-border flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="label-mono truncate">{label}</p>
          {isLoading ? (
            <div className="skeleton h-7 w-32 mt-1.5" />
          ) : (
            <p className="value-display text-[26px] leading-8 mt-1 truncate">
              {value}
            </p>
          )}
        </div>
      </div>
      <span className={`shrink-0 text-[10px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md border ${badgeClass}`}>
        {badge}
      </span>
    </div>
  );
}

export default function App() {
  const wallet = useArcWallet();
  const { balances, refetchBalances, isLoading } = useTokenBalances(wallet.account);
  const [transactions, setTransactions] = useState([]);

  const handleSwapSuccess = (txData) => {
    refetchBalances();
    if (txData) {
      setTransactions((prev) => [txData, ...prev]);
    }
  };

  return (
    <div className="min-h-screen app-canvas text-arc-textBright antialiased">
      <Header wallet={wallet} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Balances Summary Banner */}
        {wallet.account && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BalanceCard
              label="Arc Testnet · USDC Balance"
              value={`${balances.USDC} USDC`}
              badge="Native Gas"
              badgeClass="bg-arc-accentSoft text-arc-accent border-arc-accent/25"
              isLoading={isLoading}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-arc-accent">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8.5 12h7M12 8.5v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              }
            />
            <BalanceCard
              label="Arc Testnet · EURC Balance"
              value={`${balances.EURC} EURC`}
              badge="Stablecoin"
              badgeClass="bg-arc-green/10 text-arc-green border-arc-green/25"
              isLoading={isLoading}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-arc-green">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 9.5h6M9 12h6M9 14.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              }
            />
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <FxSwapCard wallet={wallet} balances={balances} onSwapSuccess={handleSwapSuccess} />
            <FxChartCard wallet={wallet} />
            <SettlementHistory transactions={transactions} />
          </div>

          <div className="lg:col-span-1 lg:sticky lg:top-6">
            <FxMarketPanel wallet={wallet} />
          </div>
        </div>
      </main>
    </div>
  );
}