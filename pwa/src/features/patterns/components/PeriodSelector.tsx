import React from 'react'

/** Selectable time ranges, in days. 1M is the default across the app. */
export const PERIOD_OPTIONS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '12M', days: 365 },
] as const

/**
 * A compact 1M / 3M / 6M / 12M range selector (stock-chart style). Drives the
 * analysis window; the chart re-scales to the chosen period.
 */
export function PeriodSelector({
  value,
  onChange,
}: {
  readonly value: number
  readonly onChange: (days: number) => void
}): React.JSX.Element {
  return (
    <div
      className="pattern-periods"
      role="group"
      aria-label="Time range"
    >
      {PERIOD_OPTIONS.map((period) => {
        const active = value === period.days
        return (
          <button
            key={period.days}
            type="button"
            className={`pattern-period${active ? ' pattern-period--active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(period.days)}
          >
            {period.label}
          </button>
        )
      })}
    </div>
  )
}
