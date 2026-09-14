import React from 'react';

export default function Header({ wallet }) {
  const {
    account,
    isCorrectNetwork,
    connectWallet,
    disconnectWallet,
    switchToArcTestnet,
    isConnecting,
    walletMissing,
    closeWalletMissing,
  } = wallet;

  // Detect whether the user is accessing the application from a mobile device.
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Utility to format address to 0x1234...abcd
  const formatAddress = (addr) =>
    `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  return (
    <>
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

          {/* Connect / Disconnect Button */}
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
                [X]
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Wallet Installation Modal */}
      {walletMissing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-arc-card border border-arc-border rounded-xl shadow-2xl p-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="w-2.5 h-2.5 bg-arc-red rounded-full animate-pulse" />

                  <span className="text-xs font-mono text-arc-red uppercase tracking-wider">
                    Wallet Required
                  </span>
                </div>

                <h2 className="text-xl font-bold text-arc-textBright font-mono">
                  Connect an EVM Wallet
                </h2>
              </div>

              {/* Close Button */}
              <button
                onClick={closeWalletMissing}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-arc-border text-arc-textMuted hover:text-white hover:bg-arc-border transition-all text-lg font-mono"
                title="Close"
                aria-label="Close wallet installation dialog"
              >
                X
              </button>
            </div>

            {/* Main Description */}
            <p className="text-sm text-arc-textMuted leading-relaxed mb-5">
              A compatible EVM wallet is required to access live Arc Testnet
              balances, FX quotes, and settlement transactions.
            </p>

            {/* Mobile / Desktop Instructions */}
            <div className="bg-arc-bg border border-arc-border rounded-lg p-4 mb-5">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-arc-accent/10 border border-arc-accent/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-arc-accent">
                    MM
                  </span>
                </div>

                <div>
                  <p className="text-sm text-arc-textBright font-mono">
                    MetaMask
                  </p>

                  <p className="text-xs text-arc-textMuted">
                    Recommended EVM wallet
                  </p>
                </div>
              </div>

              {isMobile ? (
                <div>
                  <p className="text-xs text-arc-textMuted leading-relaxed">
                    On mobile, install MetaMask and open this application
                    inside MetaMask's built-in browser. Then return here and
                    select Connect Wallet.
                  </p>

                  <div className="mt-3 px-3 py-2 rounded border border-arc-accent/20 bg-arc-accent/5">
                    <p className="text-[11px] text-arc-accent font-mono leading-relaxed">
                      MOBILE FLOW: INSTALL METAMASK -&gt; OPEN ARC DESK IN
                      METAMASK -&gt; CONNECT WALLET
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-arc-textMuted leading-relaxed">
                  Install the MetaMask browser extension, return to this
                  application, and select Connect Wallet.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col space-y-3">
              <a
                href="https://metamask.io/download"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-arc-accent hover:bg-blue-600 text-white font-mono text-sm text-center px-4 py-3 rounded-lg transition-colors"
              >
                GET METAMASK
              </a>

              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full bg-arc-bg hover:bg-arc-border border border-arc-border text-arc-textBright font-mono text-sm px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {isConnecting ? 'CHECKING WALLET...' : 'TRY AGAIN'}
              </button>
            </div>

            {/* Security Notice */}
            <div className="mt-5 pt-4 border-t border-arc-border">
              <p className="text-[11px] text-arc-textMuted leading-relaxed">
                SECURITY NOTICE: Never enter your Secret Recovery Phrase or
                private key on this website. ARC Institutional FX Desk will
                never ask for either.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}