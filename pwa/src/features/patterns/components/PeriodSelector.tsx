import React from 'react'

/** Selectable time ranges, in days. 1M is the default across the app. */
export const PERIOD_OPTIONS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
] as const

/**
 * A compact 1M / 3M / 6M / 1Y / 2Y range selector (stock-chart style). Drives the
 * visible chart window; analytics retain a longer lookback for context.
 */
export const PeriodSelector = ({
  value,
  onChange,
}: {
  readonly value: number
  readonly onChange: (days: number) => void
}): React.JSX.Element => (
  <div className="pattern-periods" role="tablist" aria-label="Chart time span">
    {PERIOD_OPTIONS.map((period) => (
      <button
        type="button"
        key={period.days}
        role="tab"
        aria-selected={value === period.days}
        className={`pattern-period${value === period.days ? ' pattern-period--active' : ''}`}
        onClick={() => onChange(period.days)}
      >
        {period.label}
      </button>
    ))}
  </div>
)
