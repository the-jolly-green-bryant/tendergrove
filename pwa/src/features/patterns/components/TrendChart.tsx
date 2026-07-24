import React, { useMemo, useState } from 'react'

import { statusFromScore } from '../../../lib/status'
import { formatDayLabel } from '../analytics/dateUtils'
import type { DateKey } from '../analytics'
import type { PatternStrainBand } from '../analytics/patternDynamics'
import { IonItem, IonLabel, IonNote } from '@ionic/react'

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
  /** De-emphasize a comparison while keeping it available to the scrubber. */
  secondary?: boolean
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
  readonly eventCounts?: number[]
  readonly action?: React.ReactNode
  readonly statusValues?: (number | null)[]
  readonly strain?: {
    label: string
    band: PatternStrainBand
    forming: boolean
  }
}

const VIEW_W = 320
const VIEW_H = 190
const PAD_L = 0
const PAD_R = 0
const PAD_T = 14
const PAD_B = 30

const EVENT_BASELINE_Y = 181
const EVENT_MAX_HEIGHT = 36

/** Fewest points the y-axis will ever span, so a flat-ish week isn't over-zoomed. */
const MIN_SPAN = 12

/** The visible y-axis range for a chart. */
interface Domain {
  min: number
  max: number
}

const computeDomain = (
  series: ChartSeries[],
  clampTo: [number, number] | null,
): Domain => {
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

const computeSeriesDomains = (
  series: ChartSeries[],
  clampTo: [number, number] | null,
): Domain[] => series.map((item) => computeDomain([item], clampTo))

const xFor = (index: number, count: number): number => {
  if (count <= 1) return PAD_L
  const span = VIEW_W - PAD_L - PAD_R
  return PAD_L + (index / (count - 1)) * span
}

const yFor = (value: number, domain: Domain): number => {
  const span = VIEW_H - PAD_T - PAD_B
  const range = domain.max - domain.min || 1
  return PAD_T + (1 - (value - domain.min) / range) * span
}

const buildPath = (values: (number | null)[], domain: Domain): string => {
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

/** The line for one series, plus point dots for solid (non-dashed) lines. */
const SeriesLine = ({
  series,
  domain,
}: {
  readonly series: ChartSeries
  readonly domain: Domain
}): React.JSX.Element => {
  const path = buildPath(series.values, domain)
  const [mX, mY] = path.split(' ')
  const missingData = ['M0', mY, mX.replace('M', 'L'), mY].join(' ')
  const strokeDasharray = series.dashed ? '5 5' : series.secondary ? '8 5' : undefined
  const opacity = series.dashed ? 0.5 : series.secondary ? 0.68 : 1
  return (
    <>
      <path
        d={missingData}
        fill="none"
        stroke={'#D3D3D3'}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={'5 5'}
        opacity={series.secondary ? 0.35 : opacity}
      />

      <path
        d={path}
        fill="none"
        stroke={series.color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        opacity={opacity}
      />
    </>
  )
}

const hasData = (series: ChartSeries[]): boolean => {
  const primaryValues =
    series.find((item) => !item.dashed)?.values ?? series[0]?.values ?? []

  return primaryValues.some((value) => value !== null)
}

const describeSeries = (series: ChartSeries[]): string =>
  series
    .map((s) => {
      const known = s.values.filter((v): v is number => v !== null)
      if (known.length === 0) return `${s.label}: no data`
      const avg = Math.round(known.reduce((a, b) => a + b, 0) / known.length)
      return `${s.label}: averaging ${avg} out of 100`
    })
    .join('; ')

const lastValueIndex = (values: (number | null)[]): number => {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== null) return i
  }
  return -1
}

const currentIndex = (series: ChartSeries[]): number => {
  const primary = series.find((s) => !s.dashed) ?? series[0]
  const index = primary ? lastValueIndex(primary.values) : -1
  return index < 0 ? 0 : index
}

const nearestDataIndex = (
  targetIndex: number,
  values: (number | null)[],
): number | null => {
  let bestIndex: number | null = null
  let bestDistance = Infinity

  values.forEach((value, index) => {
    if (value === null) return

    const distance = Math.abs(index - targetIndex)

    if (distance < bestDistance) {
      bestIndex = index
      bestDistance = distance
    }
  })

  return bestIndex
}

const useScrub = (primaryValues: (number | null)[]) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const update = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const count = primaryValues.length

    if (rect.width === 0 || count <= 1) return

    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))

    const rawIndex = Math.round(ratio * (count - 1))
    const snappedIndex = nearestDataIndex(rawIndex, primaryValues)

    setActiveIndex(snappedIndex)
  }

  return {
    activeIndex,
    update,
    clear: () => setActiveIndex(null),
  }
}

const Crosshair = ({
  index,
  series,
  domains,
  count,
}: {
  readonly index: number
  readonly series: ChartSeries[]
  readonly domains: Domain[]
  readonly count: number
}): React.JSX.Element => {
  const x = xFor(index, count)

  return (
    <g>
      <line
        x1={x}
        x2={x}
        y1={PAD_T}
        y2={VIEW_H - PAD_B}
        className="pattern-chart__crosshair"
      />

      {series.map((item, seriesIndex) => {
        const value = item.values[index]
        const domain = domains[seriesIndex]

        if (value === null || !domain || item.dashed) return null

        return (
          <circle
            key={item.label}
            cx={x}
            cy={yFor(value, domain)}
            r={4}
            fill={item.color}
            stroke="#fff"
            strokeWidth={1.5}
          />
        )
      })}
    </g>
  )
}

const _numberToStatus = (value: number | null): [string, string, string] => {
  const status = statusFromScore(value)
  if (status.level === 'unknown') return [status.label, 'gray', '']
  if (status.level === 'at-risk') return [status.label, '#D64F4F', '⛈️']
  if (status.level === 'trouble') return [status.label, '#D7B13A', '☁️']
  return [status.label, '#3FAE72', '☀️']
}

const Readout = ({
  dates,
  series,
  index,
  action,
  statusValues,
  strain,
}: {
  readonly dates: DateKey[]
  readonly series: ChartSeries[]
  readonly index: number
  readonly action?: React.ReactNode
  readonly statusValues?: (number | null)[]
  readonly strain?: {
    label: string
    band: PatternStrainBand
    forming: boolean
  }
}): React.JSX.Element | null =>
  hasData(series)
    ? (() => {
        const solid = series.filter((s) => !s.dashed)
        const [dailyStatus, _, emoji] = _numberToStatus(
          statusValues?.[index] ?? solid[0].values[index],
        )
        const status = strain?.forming
          ? 'Pattern forming'
          : (strain?.label ?? dailyStatus)
        return (
          <IonItem
            color={'transparent'}
            lines={'none'}
          >
            <IonLabel>
              <h1>
                <span
                  className={`pattern-chart__readout-value${strain ? ` pattern-chart__readout-value--${strain.band}` : ''}`}
                  style={strain ? undefined : { color: solid[0].color }}
                >
                  {status} {!strain && emoji}
                </span>
              </h1>
              <p>
                as of {dates[index] ? formatDayLabel(dates[index]) : ''}
              </p>
            </IonLabel>

            {action && <IonNote slot="end">{action}</IonNote>}
          </IonItem>
        )
      })()
    : null

interface EventBarsProps {
  readonly counts: number[]
  readonly dateCount: number
}

const EventBars = ({ counts, dateCount }: EventBarsProps): React.JSX.Element | null => {
  if (dateCount === 0) return null

  const maxCount = Math.max(0, ...counts)

  if (maxCount === 0) return null

  const slotWidth =
    dateCount > 1 ? (VIEW_W - PAD_L - PAD_R) / (dateCount - 1) : VIEW_W - PAD_L - PAD_R

  const barWidth = Math.max(2, Math.min(6, slotWidth * 0.42))

  return (
    <g
      className="pattern-chart__events"
      aria-hidden="true"
    >
      {counts.map((count, index) => {
        if (count <= 0) return null

        const height = Math.max(3, (count / maxCount) * EVENT_MAX_HEIGHT)

        const centerX = xFor(index, dateCount)

        // Keep the first and last bars inside the SVG bounds.
        const x = Math.min(VIEW_W - barWidth, Math.max(0, centerX - barWidth / 2))

        return (
          <rect
            key={`${x}-${count}`}
            className="pattern-chart__event-bar"
            x={x}
            y={EVENT_BASELINE_Y - height}
            width={barWidth}
            height={height}
            rx={barWidth / 2}
            fill="var(--ion-color-primary)"
            opacity={0.3}
          >
            <title>
              {count} {count === 1 ? 'event' : 'events'}
            </title>
          </rect>
        )
      })}
    </g>
  )
}

interface CanvasProps {
  readonly dates: DateKey[]
  readonly series: ChartSeries[]
  readonly domains: Domain[]
  readonly baseline?: number
  readonly eventCounts: number[]
  readonly highlightRect: { x: number; width: number } | null
  readonly activeIndex: number | null
}

const ChartCanvas = ({
  dates,
  series,
  domains,
  baseline,
  eventCounts,
  highlightRect,
  activeIndex,
}: CanvasProps): React.JSX.Element => {
  const has = hasData(series)
  const primaryDomain = domains[0] ?? { min: 0, max: 100 }

  const showBaseline =
    baseline !== undefined &&
    baseline > primaryDomain.min &&
    baseline < primaryDomain.max

  return (
    <>
      {highlightRect && (
        <rect
          x={highlightRect.x}
          y={PAD_T}
          width={highlightRect.width}
          height={VIEW_H - PAD_T - PAD_B}
          className="pattern-chart__highlight"
        />
      )}

      {showBaseline && (
        <line
          x1={PAD_L}
          x2={VIEW_W - PAD_R}
          y1={yFor(baseline, primaryDomain)}
          y2={yFor(baseline, primaryDomain)}
          className="pattern-chart__baseline"
        />
      )}

      {series.map((item, index) => (
        <SeriesLine
          key={item.label}
          series={item}
          domain={domains[index] ?? primaryDomain}
        />
      ))}

      <EventBars
        counts={eventCounts}
        dateCount={dates.length}
      />

      {has && activeIndex !== null && (
        <Crosshair
          index={activeIndex}
          series={series}
          domains={domains}
          count={dates.length}
        />
      )}
    </>
  )
}

const getHighlightRect = (
  dates: DateKey[],
  highlight: TrendChartProps['highlight'],
): { x: number; width: number } | null => {
  const count = dates.length
  const startIndex = dates.indexOf(highlight!.start)
  const endIndex = dates.indexOf(highlight!.end)
  if (startIndex < 0 || endIndex < 0) return null
  const x1 = xFor(startIndex, count)
  const x2 = xFor(endIndex, count)

  return {
    x: x1,
    width: Math.max(2, x2 - x1),
  }
}

export const TrendChart = ({
  dates,
  series,
  highlight,
  eventCounts = [],
  clampTo = [0, 100],
  baseline,
  action,
  statusValues,
  strain,
}: TrendChartProps): React.JSX.Element => {
  const count = dates.length
  const domains = useMemo(
    () => computeSeriesDomains(series, clampTo),
    [series, clampTo],
  )

  const has = hasData(series)
  const { activeIndex, update, clear } = useScrub(
    series.find((item) => !item.dashed)?.values ?? series[0]?.values ?? [],
  )
  const readoutIndex = activeIndex ?? currentIndex(series)

  const highlightRect = useMemo(
    () => highlight && getHighlightRect(dates, highlight),
    [dates, highlight, count],
  )

  const normalizedEventCounts = useMemo(
    () => dates.map((_, index) => Math.max(0, eventCounts[index] ?? 0)),
    [dates, eventCounts],
  )

  return (
    <figure className="pattern-chart">
      {has && (
        <Readout
          dates={dates}
          series={series}
          index={readoutIndex}
          action={action}
          statusValues={statusValues}
          strain={strain}
        />
      )}

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="pattern-chart__svg"
        role="img"
        aria-label={`Well-being trend chart. ${describeSeries(series)}.`}
        preserveAspectRatio="xMidYMid meet"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={update}
        onPointerMove={update}
        onPointerUp={clear}
        onPointerLeave={clear}
        onPointerCancel={clear}
      >
        <ChartCanvas
          dates={dates}
          series={series}
          domains={domains}
          eventCounts={normalizedEventCounts}
          baseline={baseline}
          highlightRect={highlightRect!}
          activeIndex={activeIndex}
        />
      </svg>
      {series.filter((item) => !item.dashed).length > 1 && (
        <figcaption className="pattern-chart__legend">
          {series
            .filter((item) => !item.dashed)
            .map((item) => (
              <span
                className="pattern-chart__legend-item"
                key={item.label}
              >
                <i
                  className="pattern-chart__legend-swatch"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
            ))}
        </figcaption>
      )}
    </figure>
  )
}
