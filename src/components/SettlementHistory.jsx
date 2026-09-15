import React from 'react';
import { ARC_TESTNET_PARAMS } from '../constants/arcNetwork';

export default function SettlementHistory({ transactions }) {
  return (
    <div className="bg-arc-card border border-arc-border rounded-lg p-4 sm:p-5 min-w-0">

      {/* ============================================================
          TABLE HEADER
      ============================================================ */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-arc-border pb-3">

        <h3 className="text-[11px] sm:text-xs font-mono uppercase tracking-wide sm:tracking-wider text-arc-textBright font-semibold leading-relaxed">
          SETTLEMENT HISTORY &amp; AUDIT LOG
        </h3>

        <span className="self-start sm:self-auto text-[10px] sm:text-xs font-mono text-arc-textMuted whitespace-nowrap">
          {transactions.length} RECORDED
        </span>
      </div>

      {/* ============================================================
          EMPTY STATE
      ============================================================ */}
      {transactions.length === 0 ? (
        <div className="min-h-24 sm:min-h-28 flex items-center justify-center px-4 py-6 text-center text-[10px] sm:text-xs font-mono text-arc-textMuted border border-dashed border-arc-border rounded leading-relaxed">
          NO RECENT SETTLEMENTS EXECUTED ON ARC TESTNET
        </div>
      ) : (

        /* ==========================================================
           TABLE CONTAINER

           The table intentionally remains a table on mobile.
           overflow-x-auto allows users to inspect all audit columns
           without forcing the entire page to become wider.
        =========================================================== */
        <div
          className="
            w-full
            min-w-0
            overflow-x-auto
            overscroll-x-contain
            rounded
            border border-arc-border/40
          "
        >
          <table className="w-full min-w-[760px] text-left font-mono text-[10px] sm:text-xs">

            {/* ======================================================
                TABLE HEADER
            ======================================================= */}
            <thead>
              <tr className="text-arc-textMuted border-b border-arc-border bg-arc-bg/30">

                <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium whitespace-nowrap">
                  TIME
                </th>

                <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium whitespace-nowrap">
                  PAIR
                </th>

                <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium whitespace-nowrap">
                  PAID
                </th>

                <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium whitespace-nowrap">
                  RECEIVED
                </th>

                <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium whitespace-nowrap">
                  RATE
                </th>

                <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium whitespace-nowrap">
                  STATUS
                </th>

                <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-right whitespace-nowrap">
                  TRANSACTION
                </th>

              </tr>
            </thead>

            {/* ======================================================
                TABLE BODY
            ======================================================= */}
            <tbody className="divide-y divide-arc-border/50">

              {transactions.map((tx) => (
                <tr
                  key={tx.hash}
                  className="hover:bg-arc-hover/50 transition-colors"
                >

                  {/* TIME */}
                  <td className="px-3 sm:px-4 py-3 text-arc-textMuted whitespace-nowrap">
                    {tx.time}
                  </td>

                  {/* PAIR */}
                  <td className="px-3 sm:px-4 py-3 text-arc-textBright font-bold whitespace-nowrap">
                    {tx.pair}
                  </td>

                  {/* PAID */}
                  <td className="px-3 sm:px-4 py-3 text-arc-textBright whitespace-nowrap">
                    {tx.paid}
                  </td>

                  {/* RECEIVED */}
                  <td className="px-3 sm:px-4 py-3 text-arc-green font-semibold whitespace-nowrap">
                    {tx.received}
                  </td>

                  {/* RATE */}
                  <td className="px-3 sm:px-4 py-3 text-arc-textMuted whitespace-nowrap">
                    {tx.rate}
                  </td>

                  {/* STATUS */}
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center bg-arc-green/10 text-arc-green border border-arc-green/30 px-2 py-1 rounded text-[9px] sm:text-[10px] leading-none">
                      {tx.status}
                    </span>
                  </td>

                  {/* TRANSACTION */}
                  <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">

                    <a
                      href={`${ARC_TESTNET_PARAMS.blockExplorerUrls[0]}/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        inline-flex
                        items-center
                        justify-end
                        gap-1
                        text-arc-accent
                        hover:text-arc-textBright
                        hover:underline
                        transition-colors
                        touch-manipulation
                      "
                      aria-label={`View transaction ${tx.hash} on Arc Testnet explorer`}
                    >
                      <span>
                        {tx.hash.substring(0, 6)}
                        ...
                        {tx.hash.substring(tx.hash.length - 4)}
                      </span>

                      <span aria-hidden="true">↗</span>
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