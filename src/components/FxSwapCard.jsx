import React, { useState, useRef } from 'react';
import { ARC_TOKENS, ARC_TESTNET_PARAMS } from '../constants/arcNetwork';
import { getQuote, executeSwap } from '../services/swap';

// Debounce quote requests while the user is still typing.
const QUOTE_DEBOUNCE_MS = 400;

export default function FxSwapCard({ wallet, balances, onSwapSuccess }) {
  const { account, isCorrectNetwork } = wallet;

  const [payAmount, setPayAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [txStatus, setTxStatus] = useState('IDLE');
  const [txHash, setTxHash] = useState(null);
  const [explorerUrl, setExplorerUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const debounceRef = useRef(null);
  const quoteRequestId = useRef(0);

  const payAmountNum = Number(payAmount);
  const availableUsdc = Number(balances[ARC_TOKENS.USDC.symbol] ?? 0);

  const insufficientBalance =
    payAmount !== '' &&
    !Number.isNaN(payAmountNum) &&
    payAmountNum > availableUsdc;

  // ================================================================
  // REAL FX QUOTE
  // ================================================================

  const handleAmountChange = (e) => {
    const val = e.target.value;

    setPayAmount(val);
    setErrorMsg(null);
    setQuote(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!val || Number(val) <= 0) {
      return;
    }

    debounceRef.current = setTimeout(
      () => fetchQuote(val),
      QUOTE_DEBOUNCE_MS
    );
  };

  const fetchQuote = async (amount) => {
    const requestId = ++quoteRequestId.current;

    setIsGettingQuote(true);

    try {
      const result = await getQuote({
        tokenIn: 'USDC',
        tokenOut: 'EURC',
        amountIn: amount,
      });

      // Ignore stale responses if the user kept typing.
      if (requestId !== quoteRequestId.current) return;

      setQuote({
        rate: (
          Number(result.estimatedOutput.amount) / Number(amount)
        ).toFixed(4),
        receiveAmount: result.estimatedOutput.amount,
        minReceived: result.stopLimit?.amount,
        fees: result.fees,
      });
    } catch (err) {
      if (requestId !== quoteRequestId.current) return;

      setErrorMsg(quoteErrorMessage(err));
    } finally {
      if (requestId === quoteRequestId.current) {
        setIsGettingQuote(false);
      }
    }
  };

  // ================================================================
  // REAL SWAP EXECUTION
  // ================================================================

  const handleExecuteSwap = async () => {
    if (!account) return;

    if (!isCorrectNetwork) {
      setErrorMsg('Please switch your wallet network to Arc Testnet.');
      return;
    }

    if (!quote) return;

    if (insufficientBalance) {
      setErrorMsg(
        `Insufficient USDC balance. You have ${availableUsdc} USDC.`
      );
      return;
    }

    setErrorMsg(null);
    setTxHash(null);
    setExplorerUrl(null);
    setTxStatus('PREPARING');

    try {
      setTxStatus('AWAITING_APPROVAL');

      const result = await executeSwap({
        tokenIn: 'USDC',
        tokenOut: 'EURC',
        amountIn: payAmount,
      });

      setTxStatus('SUBMITTED');
      setTxHash(result.txHash);
      setExplorerUrl(result.explorerUrl);

      setTxStatus('CONFIRMING');

      const settled =
        result.status === 'DONE' ||
        result.substatus === 'COMPLETED';

      setTxStatus(settled ? 'SETTLED' : 'FAILED');

      if (!settled) {
        setErrorMsg(
          'Swap did not reach a settled state. Check the transaction on the explorer.'
        );
      }

      const newTxRecord = {
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        pair: 'USDC / EURC',
        paid: `${result.amountIn ?? payAmount} USDC`,
        received: `${result.amountOut ?? quote.receiveAmount} EURC`,
        rate: quote.rate,
        status: settled ? 'SETTLED' : 'FAILED',
        hash: result.txHash,
      };

      onSwapSuccess?.(newTxRecord);
    } catch (err) {
      console.error('Swap Execution Error:', err);

      setTxStatus('FAILED');
      setErrorMsg(swapErrorMessage(err));
    }
  };

  const isBusy = !['IDLE', 'SETTLED', 'FAILED'].includes(txStatus);

  return (
    <div className="bg-arc-card border border-arc-border rounded-lg p-4 sm:p-5 md:p-6 shadow-xl min-w-0">

      {/* ============================================================
          CARD HEADER
      ============================================================ */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 border-b border-arc-border pb-3">

        <h2 className="text-[11px] sm:text-xs font-mono uppercase tracking-wide sm:tracking-wider text-arc-textBright font-semibold">
          STABLECOIN FX SWAP
        </h2>

        <span className="self-start sm:self-auto text-[9px] sm:text-xs font-mono text-arc-accent bg-arc-accent/10 px-2 py-1 sm:py-0.5 rounded border border-arc-accent/20 whitespace-nowrap">
          USDC ↔ EURC
        </span>
      </div>

      {/* ============================================================
          YOU PAY
      ============================================================ */}
      <div className="bg-arc-bg border border-arc-border rounded-lg p-3 sm:p-4 mb-3">

        <div className="flex items-start justify-between gap-3 text-[9px] sm:text-xs font-mono text-arc-textMuted mb-2">

          <span className="shrink-0">
            YOU PAY
          </span>

          <span className="text-right min-w-0 break-words">
            BALANCE: {balances[ARC_TOKENS.USDC.symbol]} USDC
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">

          <input
            type="number"
            placeholder="0.00"
            value={payAmount}
            onChange={handleAmountChange}
            disabled={isBusy}
            className="min-w-0 flex-1 bg-transparent text-xl sm:text-2xl font-mono text-arc-textBright outline-none placeholder:text-arc-textMuted/50"
          />

          <div className="shrink-0 bg-arc-card px-2.5 sm:px-3 py-1.5 rounded border border-arc-border text-[10px] sm:text-xs font-mono font-bold text-arc-textBright">
            USDC
          </div>
        </div>

        {insufficientBalance && (
          <div className="mt-2 text-[10px] sm:text-[11px] font-mono text-arc-red leading-relaxed">
            Exceeds available balance ({availableUsdc} USDC)
          </div>
        )}
      </div>

      {/* ============================================================
          SWAP DIRECTION INDICATOR
      ============================================================ */}
      <div className="flex justify-center -my-2 mb-2 relative z-10">

        <div className="bg-arc-border text-arc-textMuted text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-arc-card">
          ↓
        </div>
      </div>

      {/* ============================================================
          YOU RECEIVE
      ============================================================ */}
      <div className="bg-arc-bg border border-arc-border rounded-lg p-3 sm:p-4 mb-4">

        <div className="flex items-start justify-between gap-3 text-[9px] sm:text-xs font-mono text-arc-textMuted mb-2">

          <span className="min-w-0 leading-relaxed">
            YOU RECEIVE (ESTIMATED)
          </span>

          <span className="shrink-0 text-right">
            BALANCE: {balances[ARC_TOKENS.EURC.symbol]} EURC
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">

          <input
            type="text"
            readOnly
            value={
              isGettingQuote
                ? 'Fetching real quote…'
                : quote
                  ? quote.receiveAmount
                  : '0.00'
            }
            className="min-w-0 flex-1 bg-transparent text-xl sm:text-2xl font-mono text-arc-green outline-none"
          />

          <div className="shrink-0 bg-arc-card px-2.5 sm:px-3 py-1.5 rounded border border-arc-border text-[10px] sm:text-xs font-mono font-bold text-arc-textBright">
            EURC
          </div>
        </div>
      </div>

      {/* ============================================================
          LIVE QUOTE BREAKDOWN
      ============================================================ */}
      {quote && (
        <div className="bg-arc-bg/60 border border-arc-border rounded-lg p-3 mb-4 space-y-2 text-[10px] sm:text-xs font-mono">

          {/* Exchange Rate */}
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

            <span className="text-arc-textMuted shrink-0">
              EXCHANGE RATE
            </span>

            <span className="text-arc-textBright text-left sm:text-right break-words">
              1 USDC ≈ {quote.rate} EURC
            </span>
          </div>

          {/* Fees */}
          {quote.fees?.map((fee, i) => (
            <div
              key={i}
              className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <span className="text-arc-textMuted shrink-0">
                {fee.type === 'gas'
                  ? 'NETWORK FEE'
                  : 'PROVIDER FEE'}
              </span>

              <span className="text-arc-textBright text-left sm:text-right break-all">
                {fee.amount} {fee.token}
              </span>
            </div>
          ))}

          {/* Minimum Received */}
          {quote.minReceived && (
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

              <span className="text-arc-textMuted shrink-0">
                MIN RECEIVED
              </span>

              <span className="text-arc-textBright text-left sm:text-right break-words">
                {quote.minReceived} EURC
              </span>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TRANSACTION STATUS
      ============================================================ */}
      {txStatus !== 'IDLE' && (
        <div className="mb-4 p-3 bg-arc-bg border border-arc-border rounded-lg text-[10px] sm:text-xs font-mono">

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">

            <span className="text-arc-textMuted">
              TRANSACTION STATE:
            </span>

            <span
              className={`font-bold ${
                txStatus === 'SETTLED'
                  ? 'text-arc-green'
                  : txStatus === 'FAILED'
                    ? 'text-arc-red'
                    : 'text-arc-accent animate-pulse'
              }`}
            >
              {txStatus.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      {/* ============================================================
          ERROR DISPLAY
      ============================================================ */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-arc-red/10 border border-arc-red/30 rounded-lg text-[10px] sm:text-xs font-mono text-arc-red leading-relaxed break-words">
          {errorMsg}
        </div>
      )}

      {/* ============================================================
          ACTION BUTTON
      ============================================================ */}
      {!account ? (
        <button
          onClick={wallet.connectWallet}
          className="w-full bg-arc-accent hover:bg-blue-600 text-white font-mono py-3 sm:py-3.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-colors"
        >
          CONNECT WALLET TO SWAP
        </button>
      ) : (
        <button
          onClick={handleExecuteSwap}
          disabled={
            !quote ||
            Number(payAmount) <= 0 ||
            isBusy ||
            insufficientBalance
          }
          className="w-full bg-arc-accent hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-arc-accent text-white font-mono py-3 sm:py-3.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-colors"
        >
          {txStatus === 'AWAITING_APPROVAL'
            ? 'APPROVE IN WALLET...'
            : txStatus === 'SUBMITTED'
              ? 'SUBMITTED TO ARC...'
              : txStatus === 'CONFIRMING'
                ? 'CONFIRMING ON ARC TESTNET...'
                : 'EXECUTE SWAP'}
        </button>
      )}

      {/* ============================================================
          REAL TRANSACTION DETAILS
      ============================================================ */}
      {txHash && (
        <div className="mt-4 pt-4 border-t border-arc-border text-[10px] sm:text-xs font-mono space-y-2">

          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

            <span className="text-arc-textMuted shrink-0">
              TRANSACTION HASH:
            </span>

            <span className="text-arc-textBright font-bold text-left sm:text-right break-all">
              {txHash.substring(0, 10)}
              ...
              {txHash.substring(txHash.length - 8)}
            </span>
          </div>

          <div className="text-left sm:text-right pt-1">

            <a
              href={
                explorerUrl ??
                `${ARC_TESTNET_PARAMS.blockExplorerUrls[0]}/tx/${txHash}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-arc-accent hover:underline text-[10px] sm:text-xs"
            >
              VIEW ON ARC EXPLORER ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function quoteErrorMessage(err) {
  switch (err?.code) {
    case 'route_unavailable':
      return 'No swap route available right now — Arc Testnet liquidity may be thin.';

    case 'network_error':
      return 'Network error while fetching quote. Try again.';

    default:
      return 'Failed to fetch a real quote from Arc App Kit.';
  }
}

function swapErrorMessage(err) {
  switch (err?.code) {
    case 'user_rejected':
      return 'Transaction rejected by user in wallet.';

    case 'insufficient_balance':
      return 'Insufficient USDC balance for this swap.';

    case 'route_unavailable':
      return 'Swap route unavailable — Arc Testnet liquidity may be thin.';

    case 'slippage_exceeded':
      return 'Price moved beyond your slippage tolerance. Try again.';

    case 'quote_expired':
      return 'Quote expired. Requesting a new one.';

    case 'network_error':
      return 'Network or RPC error during swap execution.';

    default:
      return (
        err?.raw?.message ||
        err?.message ||
        'Transaction execution failed on Arc Testnet.'
      );
  }
}