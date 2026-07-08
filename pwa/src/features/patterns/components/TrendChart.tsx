import React, { useMemo } from 'react'

import { formatDayLabel } from '../analytics/dateUtils'
import type { DateKey } from '../analytics'

/**
 * A small, accessible well-being line chart (0–100, higher = better).
 *
 * One chart per screen, drawn as inline SVG with no chart dependency. A missing
 * day never drops the line to zero: the line bridges the gap by connecting the
 * surrounding points, while dots mark only the days that actually have data.
 * Colours come from the app theme so light/dark stay consistent. A
 * visually-hidden summary backs the chart for screen readers.
 *
 * The y-axis auto-scales to just beyond the data's own low and high points
 * (rather than a fixed 0–100), so week-to-week movement is easy to see.
 */

/** One line to draw on the chart. */
export interface ChartSeries {
  label: string
  color: string
  /** One value per x position; `null` = no data that day. */
  values: (number | null)[]
  /** Render as a dashed line (e.g. a rolling average). */
  dashed?: boolean
}

interface TrendChartProps {
  readonly dates: DateKey[]
  readonly series: ChartSeries[]
  /** Optional shaded date range (inclusive) to highlight, e.g. a turning point. */
  readonly highlight?: { start: DateKey; end: DateKey }
  /**
   * Clamp the auto-scaled y-axis to these bounds. Defaults to `[0, 100]` for
   * well-being scores; pass `null` for delta charts, where values are changes
   * that can be negative.
   */
  readonly clampTo?: [number, number] | null
  /** Draw a slightly bolder reference line at this value (e.g. 0 for deltas). */
  readonly baseline?: number
}

const VIEW_W = 320
const VIEW_H = 190
const PAD_L = 30
const PAD_R = 12
const PAD_T = 14
const PAD_B = 30

/** Fewest points the y-axis will ever span, so a flat-ish week isn't over-zoomed. */
const MIN_SPAN = 12

/** The visible y-axis range for a chart. */
interface Domain {
  min: number
  max: number
}

/**
 * Auto-scale the y-axis to just beyond the data's low and high points, padded
 * a little on each side. This makes real movement obvious without exaggerating
 * noise on a nearly-flat week. `clampTo` bounds the axis for absolute scores
 * (0–100); pass `null` to allow negatives (delta charts).
 */
function computeDomain(
  series: ChartSeries[],
  clampTo: [number, number] | null,
): Domain {
  const values = series.flatMap((s) => s.values).filter((v): v is number => v !== null)
  if (values.length === 0)
    return clampTo ? { min: clampTo[0], max: clampTo[1] } : { min: 0, max: 1 }

  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const pad = Math.max(4, (hi - lo) * 0.15)
  lo = Math.floor(lo - pad)
  hi = Math.ceil(hi + pad)
  if (clampTo) {
    lo = Math.max(clampTo[0], lo)
    hi = Math.min(clampTo[1], hi)
  }

  // Guarantee a minimum visible span so a steady week still reads clearly.
  if (hi - lo < MIN_SPAN) {
    const mid = (hi + lo) / 2
    lo = Math.round(mid - MIN_SPAN / 2)
    hi = lo + MIN_SPAN
    if (clampTo) {
      lo = Math.max(clampTo[0], lo)
      hi = Math.min(clampTo[1], hi)
    }
  }
  return { min: lo, max: hi }
}

/** ~4 evenly spaced, rounded y-axis gridline values across the domain. */
function gridValuesFor({ min, max }: Domain): number[] {
  const steps = 3
  const values: number[] = []
  for (let i = 0; i <= steps; i++) {
    values.push(Math.round(min + ((max - min) * i) / steps))
  }
  return Array.from(new Set(values))
}

function xFor(index: number, count: number): number {
  if (count <= 1) return PAD_L
  const span = VIEW_W - PAD_L - PAD_R
  return PAD_L + (index / (count - 1)) * span
}

function yFor(value: number, domain: Domain): number {
  const span = VIEW_H - PAD_T - PAD_B
  const range = domain.max - domain.min || 1
  return PAD_T + (1 - (value - domain.min) / range) * span
}

/**
 * Build one polyline path. Missing values are skipped rather than breaking the
 * line, so the line bridges gaps by connecting the last known point straight to
 * the next one. (Dots are still drawn only at real data points.)
 */
function buildPath(values: (number | null)[], domain: Domain): string {
  let path = ''
  let penDown = false
  values.forEach((value, index) => {
    if (value === null) return // skip the gap; keep the pen so the line bridges it
    const command = penDown ? 'L' : 'M'
    path += `${command}${xFor(index, values.length).toFixed(1)} ${yFor(value, domain).toFixed(1)} `
    penDown = true
  })
  return path.trim()
}

/** Pick ~3 evenly spaced x labels so the axis never gets crowded. */
function axisLabelIndexes(count: number): number[] {
  if (count <= 1) return [0]
  if (count <= 3) return dates0toN(count)
  return [0, Math.floor((count - 1) / 2), count - 1]
}

function dates0toN(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i)
}

/** Horizontal grid lines with their y-axis value labels. */
function ChartGrid({ domain }: { readonly domain: Domain }): React.JSX.Element {
  return (
    <>
      {gridValuesFor(domain).map((value) => (
        <g key={value}>
          <line
            x1={PAD_L}
            x2={VIEW_W - PAD_R}
            y1={yFor(value, domain)}
            y2={yFor(value, domain)}
            className="pattern-chart__grid"
          />
          <text
            x={PAD_L - 6}
            y={yFor(value, domain) + 3}
            className="pattern-chart__axis-text"
            textAnchor="end"
          >
            {value}
          </text>
        </g>
      ))}
    </>
  )
}

/** The line for one series, plus point dots for solid (non-dashed) lines. */
function SeriesLine({
  series,
  domain,
}: {
  readonly series: ChartSeries
  readonly domain: Domain
}): React.JSX.Element {
  const count = series.values.length
  return (
    <>
      <path
        d={buildPath(series.values, domain)}
        fill="none"
        stroke={series.color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={series.dashed ? '5 5' : undefined}
      />
      {!series.dashed &&
        series.values.map((value, index) =>
          value === null ? null : (
            <circle
              key={`${series.label}-${index}`}
              cx={xFor(index, count)}
              cy={yFor(value, domain)}
              r={2.6}
              fill={series.color}
            />
          ),
        )}
    </>
  )
}

/** Sparse x-axis day labels. */
function XAxis({ dates }: { readonly dates: DateKey[] }): React.JSX.Element {
  const count = dates.length
  return (
    <>
      {axisLabelIndexes(count).map((index) => (
        <text
          key={index}
          x={xFor(index, count)}
          y={VIEW_H - 10}
          className="pattern-chart__axis-text"
          textAnchor="middle"
        >
          {dates[index] ? formatDayLabel(dates[index]).replace(/^[A-Za-z]+, /, '') : ''}
        </text>
      ))}
    </>
  )
}

/** A short spoken summary of the series, for screen readers. */
function describeSeries(series: ChartSeries[]): string {
  return series
    .map((s) => {
      const known = s.values.filter((v): v is number => v !== null)
      if (known.length === 0) return `${s.label}: no data`
      const avg = Math.round(known.reduce((a, b) => a + b, 0) / known.length)
      return `${s.label}: averaging ${avg} out of 100`
    })
    .join('; ')
}

/** A small, accessible well-being line chart. */
export function TrendChart({
  dates,
  series,
  highlight,
  clampTo = [0, 100],
  baseline,
}: TrendChartProps): React.JSX.Element {
  const count = dates.length
  const domain = useMemo(() => computeDomain(series, clampTo), [series, clampTo])
  const showBaseline =
    baseline !== undefined && baseline > domain.min && baseline < domain.max

  const highlightRect = useMemo(() => {
    if (!highlight) return null
    const startIndex = dates.indexOf(highlight.start)
    const endIndex = dates.indexOf(highlight.end)
    if (startIndex < 0 || endIndex < 0) return null
    const x1 = xFor(startIndex, count)
    const x2 = xFor(endIndex, count)
    return { x: x1, width: Math.max(2, x2 - x1) }
  }, [dates, highlight, count])

  return (
    <figure className="pattern-chart">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="pattern-chart__svg"
        role="img"
        aria-label={`Well-being trend chart. ${describeSeries(series)}.`}
        preserveAspectRatio="xMidYMid meet"
      >
        {highlightRect && (
          <rect
            x={highlightRect.x}
            y={PAD_T}
            width={highlightRect.width}
            height={VIEW_H - PAD_T - PAD_B}
            className="pattern-chart__highlight"
          />
        )}
        <ChartGrid domain={domain} />
        {showBaseline && (
          <line
            x1={PAD_L}
            x2={VIEW_W - PAD_R}
            y1={yFor(baseline!, domain)}
            y2={yFor(baseline!, domain)}
            className="pattern-chart__baseline"
          />
        )}
        {series.map((s) => (
          <SeriesLine
            key={s.label}
            series={s}
            domain={domain}
          />
        ))}
        <XAxis dates={dates} />
      </svg>

      <figcaption className="pattern-chart__legend">
        {series.map((s) => (
          <span
            key={s.label}
            className="pattern-chart__legend-item"
          >
            <span
              className="pattern-chart__legend-swatch"
              style={{ background: s.color }}
              aria-hidden="true"
            />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
