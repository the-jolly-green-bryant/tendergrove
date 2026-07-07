import React, { useMemo } from 'react'

import { formatDayLabel } from '../analytics/dateUtils'
import type { DateKey } from '../analytics'

/**
 * A small, accessible distress line chart (0–100, higher = more distress).
 *
 * One chart per screen, drawn as inline SVG with no chart dependency. Lines
 * skip missing days rather than dropping to zero, so gaps read as "no data",
 * never as "calm". Colours come from the app theme so light/dark stay
 * consistent. A visually-hidden summary backs the chart for screen readers.
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
}

const VIEW_W = 320
const VIEW_H = 190
const PAD_L = 30
const PAD_R = 12
const PAD_T = 14
const PAD_B = 30
const Y_MAX = 100
const GRID = [0, 25, 50, 75, 100]

function xFor(index: number, count: number): number {
  if (count <= 1) return PAD_L
  const span = VIEW_W - PAD_L - PAD_R
  return PAD_L + (index / (count - 1)) * span
}

function yFor(value: number): number {
  const span = VIEW_H - PAD_T - PAD_B
  return PAD_T + (1 - value / Y_MAX) * span
}

/** Build one polyline path, breaking the line across missing values. */
function buildPath(values: (number | null)[]): string {
  let path = ''
  let penDown = false
  values.forEach((value, index) => {
    if (value === null) {
      penDown = false
      return
    }
    const command = penDown ? 'L' : 'M'
    path += `${command}${xFor(index, values.length).toFixed(1)} ${yFor(value).toFixed(1)} `
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
function ChartGrid(): React.JSX.Element {
  return (
    <>
      {GRID.map((value) => (
        <g key={value}>
          <line
            x1={PAD_L}
            x2={VIEW_W - PAD_R}
            y1={yFor(value)}
            y2={yFor(value)}
            className="pattern-chart__grid"
          />
          <text
            x={PAD_L - 6}
            y={yFor(value) + 3}
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
function SeriesLine({ series }: { readonly series: ChartSeries }): React.JSX.Element {
  const count = series.values.length
  return (
    <>
      <path
        d={buildPath(series.values)}
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
              cy={yFor(value)}
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

/** A small, accessible distress line chart. */
export function TrendChart({
  dates,
  series,
  highlight,
}: TrendChartProps): React.JSX.Element {
  const count = dates.length

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
        aria-label={`Distress trend chart. ${describeSeries(series)}.`}
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
        <ChartGrid />
        {series.map((s) => (
          <SeriesLine
            key={s.label}
            series={s}
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
