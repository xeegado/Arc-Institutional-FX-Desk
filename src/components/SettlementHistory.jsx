import React from 'react';
import { ARC_TESTNET_PARAMS } from '../constants/arcNetwork';

export default function SettlementHistory({ transactions }) {
  return (
    <div className="bg-arc-card border border-arc-border rounded-lg p-5">
      {/* Table Header Label */}
      <div className="flex justify-between items-center mb-4 border-b border-arc-border pb-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-arc-textBright font-semibold">
          SETTLEMENT HISTORY & AUDIT LOG
        </h3>
        <span className="text-xs font-mono text-arc-textMuted">
          {transactions.length} RECORDED
        </span>
      </div>

      {/* Audit Log Table */}
      {transactions.length === 0 ? (
        <div className="py-8 text-center text-xs font-mono text-arc-textMuted border border-dashed border-arc-border rounded">
          NO RECENT SETTLEMENTS EXECUTED ON ARC TESTNET
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-arc-textMuted border-b border-arc-border">
                <th className="pb-2">TIME</th>
                <th className="pb-2">PAIR</th>
                <th className="pb-2">PAID</th>
                <th className="pb-2">RECEIVED</th>
                <th className="pb-2">RATE</th>
                <th className="pb-2">STATUS</th>
                <th className="pb-2 text-right">TRANSACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arc-border/50">
              {transactions.map((tx) => (
                <tr key={tx.hash} className="hover:bg-arc-hover/50">
                  <td className="py-3 text-arc-textMuted">{tx.time}</td>
                  <td className="py-3 text-arc-textBright font-bold">{tx.pair}</td>
                  <td className="py-3 text-arc-textBright">{tx.paid}</td>
                  <td className="py-3 text-arc-green font-semibold">{tx.received}</td>
                  <td className="py-3 text-arc-textMuted">{tx.rate}</td>
                  <td className="py-3">
                    <span className="bg-arc-green/10 text-arc-green border border-arc-green/30 px-2 py-0.5 rounded text-[10px]">
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <a
                      href={`${ARC_TESTNET_PARAMS.blockExplorerUrls[0]}/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-arc-accent hover:underline"
                    >
                      {tx.hash.substring(0, 6)}...{tx.hash.substring(tx.hash.length - 4)} ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}