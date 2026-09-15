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

  // Detect whether the application is being accessed from a mobile device.
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Format wallet address as 0x1234...abcd.
  const formatAddress = (addr) =>
    `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  return (
    <>
      <header className="w-full bg-arc-card border-b border-arc-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">

            {/* =========================================================
                BRAND
            ========================================================== */}
            <div className="flex items-center min-w-0">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-arc-accent rounded-full animate-pulse shrink-0 mr-2 sm:mr-3" />

              <h1 className="min-w-0 text-[11px] sm:text-lg font-bold tracking-wide sm:tracking-wider text-arc-textBright font-mono uppercase truncate">
                ARC <span className="text-arc-accent">INSTITUTIONAL</span> FX
              </h1>

              <span className="shrink-0 ml-1.5 sm:ml-2 text-[8px] sm:text-xs bg-arc-border text-arc-textMuted px-1.5 sm:px-2 py-0.5 rounded font-mono">
                TESTNET
              </span>
            </div>

            {/* =========================================================
                WALLET / NETWORK AREA
            ========================================================== */}
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">

              {/* Network Status */}
              {account && (
                <div className="w-full sm:w-auto">
                  {isCorrectNetwork ? (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[9px] sm:text-xs text-arc-green bg-arc-green/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded border border-arc-green/20 font-mono whitespace-nowrap">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-arc-green shrink-0" />
                      <span>ARC TESTNET</span>
                    </div>
                  ) : (
                    <button
                      onClick={switchToArcTestnet}
                      className="w-full sm:w-auto text-[9px] sm:text-xs text-arc-red bg-arc-red/10 border border-arc-red/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono hover:bg-arc-red/20 transition-all"
                    >
                      <span className="sm:hidden">SWITCH TO ARC TESTNET</span>

                      <span className="hidden sm:inline">
                        WRONG NETWORK — SWITCH TO ARC
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Connect / Disconnect */}
              {!account ? (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="w-full sm:w-auto bg-arc-accent hover:bg-blue-600 text-white font-mono text-[10px] sm:text-sm px-3 sm:px-4 py-2 sm:py-2 rounded transition-colors disabled:opacity-50"
                >
                  {isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
                </button>
              ) : (
                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 bg-arc-bg border border-arc-border rounded px-2.5 sm:px-3 py-1.5 sm:py-1.5 min-w-0">
                  <span
                    className="min-w-0 truncate text-[9px] sm:text-xs font-mono text-arc-textBright"
                    title={account}
                  >
                    {formatAddress(account)}
                  </span>

                  <button
                    onClick={disconnectWallet}
                    className="shrink-0 text-[10px] sm:text-xs text-arc-textMuted hover:text-arc-red ml-1 sm:ml-2 font-mono transition-colors"
                    title="Disconnect Wallet"
                    aria-label="Disconnect Wallet"
                  >
                    [X]
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===============================================================
          WALLET INSTALLATION MODAL
      ================================================================ */}
      {walletMissing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-3 sm:px-4 py-5 sm:py-6 overflow-y-auto">
          <div className="w-full max-w-md bg-arc-card border border-arc-border rounded-xl shadow-2xl p-4 sm:p-6 my-auto">

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-arc-red rounded-full animate-pulse shrink-0" />

                  <span className="text-[9px] sm:text-xs font-mono text-arc-red uppercase tracking-wider">
                    Wallet Required
                  </span>
                </div>

                <h2 className="text-base sm:text-xl font-bold text-arc-textBright font-mono">
                  Connect an EVM Wallet
                </h2>
              </div>

              <button
                onClick={closeWalletMissing}
                className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-md border border-arc-border text-arc-textMuted hover:text-white hover:bg-arc-border transition-all text-base sm:text-lg font-mono"
                title="Close"
                aria-label="Close wallet installation dialog"
              >
                X
              </button>
            </div>

            {/* Main Description */}
            <p className="text-[11px] sm:text-sm text-arc-textMuted leading-relaxed mb-4 sm:mb-5">
              A compatible EVM wallet is required to access live Arc Testnet
              balances, FX quotes, and settlement transactions.
            </p>

            {/* Wallet Information */}
            <div className="bg-arc-bg border border-arc-border rounded-lg p-3 sm:p-4 mb-4 sm:mb-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg bg-arc-accent/10 border border-arc-accent/20 flex items-center justify-center">
                  <span className="text-xs sm:text-sm font-bold text-arc-accent">
                    MM
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-arc-textBright font-mono">
                    MetaMask
                  </p>

                  <p className="text-[10px] sm:text-xs text-arc-textMuted">
                    Recommended EVM wallet
                  </p>
                </div>
              </div>

              {isMobile ? (
                <div>
                  <p className="text-[11px] sm:text-xs text-arc-textMuted leading-relaxed">
                    On mobile, install MetaMask and open this application
                    inside MetaMask's built-in browser. Then return here and
                    select Connect Wallet.
                  </p>

                  <div className="mt-2.5 px-2.5 py-2 rounded border border-arc-accent/20 bg-arc-accent/5">
                    <p className="text-[9px] sm:text-[11px] text-arc-accent font-mono leading-relaxed">
                      MOBILE FLOW: INSTALL METAMASK → OPEN ARC DESK IN
                      METAMASK → CONNECT WALLET
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] sm:text-xs text-arc-textMuted leading-relaxed">
                  Install the MetaMask browser extension, return to this
                  application, and select Connect Wallet.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 sm:gap-3">
              <a
                href="https://metamask.io/download"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-arc-accent hover:bg-blue-600 text-white font-mono text-[11px] sm:text-sm text-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors"
              >
                GET METAMASK
              </a>

              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full bg-arc-bg hover:bg-arc-border border border-arc-border text-arc-textBright font-mono text-[11px] sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {isConnecting ? 'CHECKING WALLET...' : 'TRY AGAIN'}
              </button>
            </div>

            {/* Security Notice */}
            <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-arc-border">
              <p className="text-[9px] sm:text-[11px] text-arc-textMuted leading-relaxed">
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
