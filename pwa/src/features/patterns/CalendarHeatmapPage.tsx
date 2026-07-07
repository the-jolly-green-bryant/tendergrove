import { IonCard, IonCardContent } from '@ionic/react'
import React, { useMemo, useState } from 'react'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import type { AnalyticsResult, CalendarDayPattern, DistressLevel } from './analytics'
import { dateKeyToDate, formatDayLabel } from './analytics/dateUtils'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { usePatternsAnalytics } from './usePatternsAnalytics'

import './patterns.css'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const LEVEL_LABEL: Record<DistressLevel, string> = {
  low: 'Low (0–25)',
  moderate: 'Moderate (26–60)',
  high: 'High (61–80)',
  veryHigh: 'Very high (81–100)',
}

interface MonthGroup {
  key: string
  label: string
  /** Grid slots: null = padding, otherwise a day. */
  slots: (CalendarDayPattern | null)[]
}

/** Group calendar days into month grids with correct weekday alignment. */
function groupByMonth(calendar: CalendarDayPattern[]): MonthGroup[] {
  const months = new Map<string, CalendarDayPattern[]>()
  for (const day of calendar) {
    const key = day.date.slice(0, 7)
    if (!months.has(key)) months.set(key, [])
    months.get(key)!.push(day)
  }

  return Array.from(months.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest month first
    .map(([key, days]) => {
      const first = dateKeyToDate(days[0].date)
      const leadingPad = first.getDay()
      const slots: (CalendarDayPattern | null)[] = Array(leadingPad).fill(null)
      slots.push(...days)
      return {
        key,
        label: first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        slots,
      }
    })
}

function cellClass(day: CalendarDayPattern, selected: boolean): string {
  const level = day.level
    ? `pattern-calendar-cell--${day.level}`
    : 'pattern-calendar-cell--nodata'
  return `pattern-calendar-cell ${level}${selected ? ' pattern-calendar-cell--selected' : ''}`
}

/** Small dots hint at activity (check-ins / incidents) without adding numbers. */
function activityDots(day: CalendarDayPattern): string {
  if (day.incidentCount > 0) return '⚠'
  if (day.checkInCount > 0) return '•'
  return ''
}

function DayDetail({ day }: { readonly day: CalendarDayPattern }): React.JSX.Element {
  return (
    <IonCard>
      <IonCardContent>
        <h3 className="pattern-turning-card__date">{formatDayLabel(day.date)}</h3>
        <p className="pattern-row__meta">{day.shortSummary}</p>
        <div className="pattern-day-detail__stats">
          <span className="pattern-day-detail__stat">
            <span className="pattern-day-detail__value">
              {day.score === null ? '—' : day.score}
            </span>
            <span className="pattern-day-detail__label">Distress score</span>
          </span>
          <span className="pattern-day-detail__stat">
            <span className="pattern-day-detail__value">{day.checkInCount}</span>
            <span className="pattern-day-detail__label">Check-ins</span>
          </span>
          <span className="pattern-day-detail__stat">
            <span className="pattern-day-detail__value">{day.incidentCount}</span>
            <span className="pattern-day-detail__label">Incidents</span>
          </span>
        </div>
      </IonCardContent>
    </IonCard>
  )
}

function CalendarContent({
  result,
}: {
  readonly result: AnalyticsResult
}): React.JSX.Element {
  const months = useMemo(() => groupByMonth(result.calendar), [result.calendar])
  const [selected, setSelected] = useState<CalendarDayPattern | null>(null)

  return (
    <>
      <p className="patterns-lede">
        Each day is coloured by its overall distress. Darker, warmer days may be worth a
        closer look. Tap a day for details.
      </p>

      {months.map((month) => (
        <section
          key={month.key}
          className="pattern-calendar-month"
        >
          <h2 className="pattern-calendar-heading">{month.label}</h2>
          <div className="pattern-calendar-grid">
            {DOW.map((dow) => (
              <div
                key={dow}
                className="pattern-calendar-dow"
              >
                {dow}
              </div>
            ))}
            {month.slots.map((day, index) =>
              day === null ? (
                <div
                  key={`pad-${index}`}
                  className="pattern-calendar-cell pattern-calendar-cell--empty"
                  aria-hidden="true"
                />
              ) : (
                <button
                  key={day.date}
                  type="button"
                  className={cellClass(day, selected?.date === day.date)}
                  aria-label={`${formatDayLabel(day.date)}: ${day.shortSummary}`}
                  onClick={() => setSelected(day)}
                >
                  <span className="pattern-calendar-cell__day">
                    {dateKeyToDate(day.date).getDate()}
                  </span>
                  <span
                    className="pattern-calendar-cell__dots"
                    aria-hidden="true"
                  >
                    {activityDots(day)}
                  </span>
                </button>
              ),
            )}
          </div>
        </section>
      ))}

      <div className="pattern-legend">
        {(Object.keys(LEVEL_LABEL) as DistressLevel[]).map((level) => (
          <span
            key={level}
            className="pattern-legend__item"
          >
            <span
              className={`pattern-legend__swatch pattern-calendar-cell--${level}`}
            />
            {LEVEL_LABEL[level]}
          </span>
        ))}
      </div>

      {selected && <DayDetail day={selected} />}
    </>
  )
}

/**
 * Calendar heatmap page. Consumes: calendar day patterns.
 */
export default function CalendarHeatmapPage(): React.JSX.Element {
  const { result, isLoading, hasError } = usePatternsAnalytics()

  return (
    <Page
      title="Calendar heatmap"
      className="patterns-page"
      backHref="/patterns"
    >
      {isLoading && <LoadingState />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading &&
        !hasError &&
        result &&
        (result.dataQuality.scoredDays === 0 ? (
          <PatternsEmptyState message={result.dataQuality.message} />
        ) : (
          <CalendarContent result={result} />
        ))}
    </Page>
  )
}
