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