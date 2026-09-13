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
  const [txStatus, setTxStatus] = useState('IDLE'); // IDLE | PREPARING | AWAITING_APPROVAL | SUBMITTED | CONFIRMING | SETTLED | FAILED
  const [txHash, setTxHash] = useState(null);
  const [explorerUrl, setExplorerUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const debounceRef = useRef(null);
  const quoteRequestId = useRef(0);

  const payAmountNum = Number(payAmount);
  const availableUsdc = Number(balances[ARC_TOKENS.USDC.symbol] ?? 0);
  const insufficientBalance =
    payAmount !== '' && !Number.isNaN(payAmountNum) && payAmountNum > availableUsdc;

  // Phase 4: Real FX Quote — via App Kit's estimateSwap, never a frontend calculation.
  const handleAmountChange = (e) => {
    const val = e.target.value;
    setPayAmount(val);
    setErrorMsg(null);
    setQuote(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val || Number(val) <= 0) {
      return;
    }

    debounceRef.current = setTimeout(() => fetchQuote(val), QUOTE_DEBOUNCE_MS);
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
        rate: (Number(result.estimatedOutput.amount) / Number(amount)).toFixed(4),
        receiveAmount: result.estimatedOutput.amount,
        minReceived: result.stopLimit?.amount,
        fees: result.fees, // [{ token, amount, type }]
      });
    } catch (err) {
      if (requestId !== quoteRequestId.current) return;
      setErrorMsg(quoteErrorMessage(err));
    } finally {
      if (requestId === quoteRequestId.current) setIsGettingQuote(false);
    }
  };

  // Phase 5 & 6: Execute the real swap through App Kit; the connected wallet signs it.
  const handleExecuteSwap = async () => {
    if (!account) return;
    if (!isCorrectNetwork) {
      setErrorMsg('Please switch your wallet network to Arc Testnet.');
      return;
    }
    if (!quote) return;
    if (insufficientBalance) {
      setErrorMsg(`Insufficient USDC balance. You have ${availableUsdc} USDC.`);
      return;
    }

    setErrorMsg(null);
    setTxHash(null);
    setExplorerUrl(null);
    setTxStatus('PREPARING');

    try {
      setTxStatus('AWAITING_APPROVAL'); // wallet signature prompt happens inside executeSwap
      const result = await executeSwap({
        tokenIn: 'USDC',
        tokenOut: 'EURC',
        amountIn: payAmount,
      });

      setTxStatus('SUBMITTED');
      setTxHash(result.txHash);
      setExplorerUrl(result.explorerUrl);

      setTxStatus('CONFIRMING');
      // App Kit's swap() already waits for settlement before resolving, so
      // by the time we're here the result reflects the final state.
      const settled = result.status === 'DONE' || result.substatus === 'COMPLETED';
      setTxStatus(settled ? 'SETTLED' : 'FAILED');
      if (!settled) {
        setErrorMsg('Swap did not reach a settled state. Check the transaction on the explorer.');
      }

      const newTxRecord = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        pair: 'USDC / EURC',
        paid: `${result.amountIn ?? payAmount} USDC`,
        received: `${result.amountOut ?? quote.receiveAmount} EURC`,
        rate: quote.rate,
        status: settled ? 'SETTLED' : 'FAILED',
        hash: result.txHash,
      };
      onSwapSuccess?.(newTxRecord);

      // Balance refresh after a settled swap is owned by the parent
      // (App.jsx's useTokenBalances, triggered via onSwapSuccess below) —
      // not duplicated here.
    } catch (err) {
      console.error('Swap Execution Error:', err);
      setTxStatus('FAILED');
      setErrorMsg(swapErrorMessage(err));
    }
  };

  const isBusy = !['IDLE', 'SETTLED', 'FAILED'].includes(txStatus);

  return (
    <div className="bg-arc-card border border-arc-border rounded-lg p-6 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-arc-border pb-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-arc-textBright font-semibold">
          STABLECOIN FX SWAP
        </h2>
        <span className="text-xs font-mono text-arc-accent bg-arc-accent/10 px-2 py-0.5 rounded border border-arc-accent/20">
          USDC ↔ EURC
        </span>
      </div>

      {/* You Pay Input */}
      <div className="bg-arc-bg border border-arc-border rounded p-4 mb-3">
        <div className="flex justify-between text-xs font-mono text-arc-textMuted mb-2">
          <span>YOU PAY</span>
          <span>BALANCE: {balances[ARC_TOKENS.USDC.symbol]} USDC</span>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="number"
            placeholder="0.00"
            value={payAmount}
            onChange={handleAmountChange}
            disabled={isBusy}
            className="w-full bg-transparent text-2xl font-mono text-arc-textBright outline-none"
          />
          <div className="bg-arc-card px-3 py-1.5 rounded border border-arc-border text-xs font-mono font-bold text-arc-textBright">
            USDC
          </div>
        </div>
        {insufficientBalance && (
          <div className="mt-2 text-[11px] font-mono text-arc-red">
            Exceeds available balance ({availableUsdc} USDC)
          </div>
        )}
      </div>

      {/* Swap Arrow Indicator */}
      <div className="flex justify-center -my-2 mb-2 relative z-10">
        <div className="bg-arc-border text-arc-textMuted text-xs px-2 py-1 rounded-full border border-arc-card">
          ↓
        </div>
      </div>

      {/* You Receive Input */}
      <div className="bg-arc-bg border border-arc-border rounded p-4 mb-4">
        <div className="flex justify-between text-xs font-mono text-arc-textMuted mb-2">
          <span>YOU RECEIVE (ESTIMATED)</span>
          <span>BALANCE: {balances[ARC_TOKENS.EURC.symbol]} EURC</span>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="text"
            readOnly
            value={isGettingQuote ? 'Fetching real quote…' : quote ? quote.receiveAmount : '0.00'}
            className="w-full bg-transparent text-2xl font-mono text-arc-green outline-none"
          />
          <div className="bg-arc-card px-3 py-1.5 rounded border border-arc-border text-xs font-mono font-bold text-arc-textBright">
            EURC
          </div>
        </div>
      </div>

      {/* Live Quote Breakdown — real numbers from App Kit's estimateSwap */}
      {quote && (
        <div className="bg-arc-bg/60 border border-arc-border rounded p-3 mb-4 space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-arc-textMuted">
            <span>EXCHANGE RATE</span>
            <span className="text-arc-textBright">1 USDC ≈ {quote.rate} EURC</span>
          </div>
          {quote.fees?.map((fee, i) => (
            <div key={i} className="flex justify-between text-arc-textMuted">
              <span>{fee.type === 'gas' ? 'NETWORK FEE' : 'PROVIDER FEE'}</span>
              <span className="text-arc-textBright">{fee.amount} {fee.token}</span>
            </div>
          ))}
          {quote.minReceived && (
            <div className="flex justify-between text-arc-textMuted">
              <span>MIN RECEIVED</span>
              <span className="text-arc-textBright">{quote.minReceived} EURC</span>
            </div>
          )}
        </div>
      )}

      {/* Live Execution Status Bar */}
      {txStatus !== 'IDLE' && (
        <div className="mb-4 p-3 bg-arc-bg border border-arc-border rounded text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-arc-textMuted">TRANSACTION STATE:</span>
            <span className={`font-bold ${
              txStatus === 'SETTLED' ? 'text-arc-green' :
              txStatus === 'FAILED' ? 'text-arc-red' : 'text-arc-accent animate-pulse'
            }`}>
              {txStatus.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-arc-red/10 border border-arc-red/30 rounded text-xs font-mono text-arc-red">
          {errorMsg}
        </div>
      )}

      {/* Action Button */}
      {!account ? (
        <button
          onClick={wallet.connectWallet}
          className="w-full bg-arc-accent hover:bg-blue-600 text-white font-mono py-3 rounded text-xs font-bold uppercase transition-colors"
        >
          CONNECT WALLET TO SWAP
        </button>
      ) : (
        <button
          onClick={handleExecuteSwap}
          disabled={!quote || Number(payAmount) <= 0 || isBusy || insufficientBalance}
          className="w-full bg-arc-accent hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-arc-accent text-white font-mono py-3 rounded text-xs font-bold uppercase transition-colors"
        >
          {txStatus === 'AWAITING_APPROVAL' ? 'APPROVE IN WALLET...' :
           txStatus === 'SUBMITTED' ? 'SUBMITTED TO ARC...' :
           txStatus === 'CONFIRMING' ? 'CONFIRMING ON ARC TESTNET...' :
           'EXECUTE SWAP'}
        </button>
      )}

      {/* Real Transaction Details & Explorer Link */}
      {txHash && (
        <div className="mt-4 pt-4 border-t border-arc-border text-xs font-mono space-y-1">
          <div className="flex justify-between text-arc-textMuted">
            <span>TRANSACTION HASH:</span>
            <span className="text-arc-textBright font-bold">{txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}</span>
          </div>
          <div className="text-right mt-2">
            <a
              href={explorerUrl ?? `${ARC_TESTNET_PARAMS.blockExplorerUrls[0]}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-arc-accent hover:underline text-xs"
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
    case 'route_unavailable': return 'No swap route available right now — Arc Testnet liquidity may be thin.';
    case 'network_error': return 'Network error while fetching quote. Try again.';
    default: return 'Failed to fetch a real quote from Arc App Kit.';
  }
}

function swapErrorMessage(err) {
  switch (err?.code) {
    case 'user_rejected': return 'Transaction rejected by user in wallet.';
    case 'insufficient_balance': return 'Insufficient USDC balance for this swap.';
    case 'route_unavailable': return 'Swap route unavailable — Arc Testnet liquidity may be thin.';
    case 'slippage_exceeded': return 'Price moved beyond your slippage tolerance. Try again.';
    case 'quote_expired': return 'Quote expired. Requesting a new one.';
    case 'network_error': return 'Network or RPC error during swap execution.';
    default: return err?.raw?.message || err?.message || 'Transaction execution failed on Arc Testnet.';
  }
}