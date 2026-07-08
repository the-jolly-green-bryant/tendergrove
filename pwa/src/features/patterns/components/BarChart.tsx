import React from 'react'

/** One bar in a `BarChart`. */
export interface Bar {
  label: string
  /** 0–100, or null for "no data". */
  value: number | null
  /** Optional per-bar colour (defaults to the brand primary). */
  color?: string
}

const VIEW_W = 320
const VIEW_H = 180
const PAD_L = 8
const PAD_R = 8
const PAD_T = 22
const PAD_B = 26

const DEFAULT_COLOR = 'var(--ion-color-primary)'

function barGeometry(count: number): { slot: number; width: number } {
  const usable = VIEW_W - PAD_L - PAD_R
  const slot = usable / Math.max(1, count)
  return { slot, width: Math.min(30, slot * 0.6) }
}

/** A short spoken description of one bar. */
function describeBar(bar: Bar, valueSuffix: string): string {
  const value =
    bar.value === null ? 'no data' : `${Math.round(bar.value)}${valueSuffix}`
  return `${bar.label}: ${value}`
}

interface ColumnProps {
  readonly bar: Bar
  readonly cx: number
  readonly width: number
  readonly chartH: number
  readonly axisMax: number
  readonly valueSuffix: string
}

/** One bar column: the bar (or an empty marker) plus its value and label. */
function BarColumn({
  bar,
  cx,
  width,
  chartH,
  axisMax,
  valueSuffix,
}: ColumnProps): React.JSX.Element {
  const value = bar.value ?? 0
  const height = (Math.min(value, axisMax) / axisMax) * chartH
  const y = PAD_T + (chartH - height)
  return (
    <g>
      {bar.value === null ? (
        <rect
          x={cx - width / 2}
          y={PAD_T + chartH - 2}
          width={width}
          height={2}
          className="pattern-bar--empty"
          rx={1}
        />
      ) : (
        <rect
          x={cx - width / 2}
          y={y}
          width={width}
          height={Math.max(2, height)}
          fill={bar.color ?? DEFAULT_COLOR}
          rx={4}
        />
      )}
      {bar.value !== null && (
        <text
          x={cx}
          y={y - 5}
          className="pattern-chart__axis-text"
          textAnchor="middle"
        >
          {Math.round(bar.value)}
          {valueSuffix}
        </text>
      )}
      <text
        x={cx}
        y={VIEW_H - 9}
        className="pattern-chart__axis-text"
        textAnchor="middle"
      >
        {bar.label}
      </text>
    </g>
  )
}

/**
 * A small, responsive SVG bar chart (values 0–100 by default). One takeaway
 * should always accompany it on the page; the chart itself stays quiet and
 * legible. A visually-hidden summary backs it for screen readers.
 */
export function BarChart({
  bars,
  valueSuffix = '%',
  ariaLabel,
  yMax = 100,
}: {
  readonly bars: Bar[]
  readonly valueSuffix?: string
  readonly ariaLabel?: string
  /** Top of the y-axis; defaults to 100 (rates). Pass a smaller cap for shares. */
  readonly yMax?: number
}): React.JSX.Element {
  const { slot, width } = barGeometry(bars.length)
  const chartH = VIEW_H - PAD_T - PAD_B
  const axisMax = Math.max(1, yMax)
  const description =
    ariaLabel ?? bars.map((b) => describeBar(b, valueSuffix)).join(', ')

  return (
    <figure className="pattern-chart">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="pattern-chart__svg"
        role="img"
        aria-label={description}
        preserveAspectRatio="xMidYMid meet"
      >
        {bars.map((bar, index) => (
          <BarColumn
            key={bar.label}
            bar={bar}
            cx={PAD_L + slot * index + slot / 2}
            width={width}
            chartH={chartH}
            axisMax={axisMax}
            valueSuffix={valueSuffix}
          />
        ))}
      </svg>
    </figure>
  )
}
