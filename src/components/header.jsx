import React from 'react';

export default function Header({ wallet }) {
  const { account, isCorrectNetwork, connectWallet, disconnectWallet, switchToArcTestnet, isConnecting } = wallet;

  // Utility to format address to 0x1234...abcd
  const formatAddress = (addr) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  return (
    <header className="w-full bg-arc-card border-b border-arc-border px-6 py-3 flex items-center justify-between">
      {/* Brand & Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-3 h-3 bg-arc-accent rounded-full animate-pulse" />
        <h1 className="text-lg font-bold tracking-wider text-arc-textBright font-mono uppercase">
          ARC <span className="text-arc-accent">INSTITUTIONAL</span> FX
        </h1>
        <span className="text-xs bg-arc-border text-arc-textMuted px-2 py-0.5 rounded font-mono">
          TESTNET
        </span>
      </div>

      {/* Network Status & Wallet Actions */}
      <div className="flex items-center space-x-4">
        {account && (
          <div>
            {isCorrectNetwork ? (
              <span className="flex items-center space-x-2 text-xs text-arc-green bg-arc-green/10 px-3 py-1.5 rounded border border-arc-green/20 font-mono">
                <span className="w-2 h-2 rounded-full bg-arc-green"></span>
                <span>ARC TESTNET</span>
              </span>
            ) : (
              <button
                onClick={switchToArcTestnet}
                className="text-xs text-arc-red bg-arc-red/10 border border-arc-red/30 px-3 py-1.5 rounded font-mono hover:bg-arc-red/20 transition-all"
              >
                WRONG NETWORK (SWITCH TO ARC)
              </button>
            )}
          </div>
        )}

        {/* Connect/Disconnect Button */}
        {!account ? (
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="bg-arc-accent hover:bg-blue-600 text-white font-mono text-sm px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            {isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
          </button>
        ) : (
          <div className="flex items-center space-x-2 bg-arc-bg border border-arc-border rounded px-3 py-1.5">
            <span className="text-xs font-mono text-arc-textBright">
              {formatAddress(account)}
            </span>
            <button
              onClick={disconnectWallet}
              className="text-xs text-arc-textMuted hover:text-arc-red ml-2 font-mono"
              title="Disconnect Wallet"
            >
              [✕]
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

