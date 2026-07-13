import React from 'react'

/** One row of the heatmap (an indicator across the week). */
export interface HeatmapRow {
  id: string
  label: string
  /** 7 values (Sun…Sat), 0–100, or null for "no data". */
  values: (number | null)[]
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const cellStyle = (
  value: number | null,
  scale: 'rose' | 'green',
): React.CSSProperties => {
  if (value === null) return { background: 'var(--wb-none)', opacity: 0.35 }
  const rgb = scale === 'green' ? '78, 157, 94' : '226, 89, 75'
  const alpha = 0.1 + (value / 100) * 0.75
  return { background: `rgba(${rgb}, ${alpha.toFixed(3)})` }
}

export const HeatmapGrid = ({
  rows,
  scale = 'rose',
  onSelect,
}: {
  readonly rows: HeatmapRow[]
  readonly scale?: 'rose' | 'green'
  readonly onSelect: (rowId: string, weekday: number) => void
}): React.JSX.Element => (
  <div
    className="pattern-heatmap"
    role="table"
    aria-label="Indicator likelihood by day of week"
  >
    <div
      className="pattern-heatmap__row pattern-heatmap__row--head"
      role="row"
    >
      <span className="pattern-heatmap__rowlabel" />
      {WEEKDAY_INITIALS.map((initial, weekday) => (
        <span
          key={`r1-${WEEKDAY_NAMES[weekday]}`}
          className="pattern-heatmap__colhead"
          role="columnheader"
          aria-label={WEEKDAY_NAMES[weekday]}
        >
          {initial}
        </span>
      ))}
    </div>

    {rows.map((row) => (
      <div
        key={row.id}
        className="pattern-heatmap__row"
        role="row"
      >
        <span
          className="pattern-heatmap__rowlabel"
          role="rowheader"
        >
          {row.label}
        </span>
        {row.values.map((value, weekday) => (
          <button
            key={`r2-${WEEKDAY_NAMES[weekday]}`}
            type="button"
            className="pattern-heatmap__cell"
            style={cellStyle(value, scale)}
            onClick={() => onSelect(row.id, weekday)}
            aria-label={`${row.label}, ${WEEKDAY_NAMES[weekday]}: ${
              value === null ? 'no data' : `${Math.round(value)} percent`
            }`}
          >
            <span aria-hidden="true">{value === null ? '' : Math.round(value)}</span>
          </button>
        ))}
      </div>
    ))}
  </div>
)
