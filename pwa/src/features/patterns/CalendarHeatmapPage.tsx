import { IonButton, IonCard, IonCardContent, IonModal } from '@ionic/react'
import React, { useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import { useSelectedDate } from '../../context/SelectedDateContext'
import type { CalendarDayPattern, WellbeingLevel } from './analytics'
import { dateKeyToDate, formatDayLabel } from './analytics/dateUtils'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { useScopedPatterns } from './useScopedPatterns'

import './patterns.scss'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const LEVEL_LABEL: Record<WellbeingLevel, string> = {
  struggling: 'Struggling (0–34)',
  mixed: 'Mixed (35–59)',
  good: 'Good (60–79)',
  thriving: 'Thriving (80–100)',
}

interface MonthGroup {
  key: string
  label: string
  /** Grid slots: null = padding, otherwise a day. */
  slots: (CalendarDayPattern | null)[]
}

const groupByMonth = (calendar: CalendarDayPattern[]): MonthGroup[] => {
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
      const monthStartWeekday = (first.getDay() - ((first.getDate() - 1) % 7) + 7) % 7
      const leadingPad = monthStartWeekday + first.getDate() - 1
      const slots: (CalendarDayPattern | null)[] = Array(leadingPad).fill(null)
      slots.push(...days)
      return {
        key,
        label: first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        slots,
      }
    })
}

const cellClass = (day: CalendarDayPattern, selected: boolean): string => {
  const level = day.level
    ? `pattern-calendar-cell--${day.level}`
    : 'pattern-calendar-cell--nodata'
  return `pattern-calendar-cell ${level}${selected ? ' pattern-calendar-cell--selected' : ''}`
}

const activityDots = (day: CalendarDayPattern): string => {
  if (day.incidentCount > 0) return '⚠'
  if (day.checkInCount > 0) return '•'
  return ''
}

const DayDetail = ({
  day,
  onAddCheckIn,
}: {
  readonly day: CalendarDayPattern
  readonly onAddCheckIn: (dateKey: string) => void
}): React.JSX.Element => (
  <IonCard>
    <IonCardContent>
      <h3 className="pattern-turning-card__date">{formatDayLabel(day.date)}</h3>
      <p className="pattern-row__meta">{day.shortSummary}</p>
      <div className="pattern-day-detail__stats">
        <span className="pattern-day-detail__stat">
          <span className="pattern-day-detail__value">
            {day.score === null ? '—' : day.score}
          </span>
          <span className="pattern-day-detail__label">Well-being score</span>
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

      <IonButton
        expand="block"
        fill={day.checkInCount > 0 ? 'outline' : 'solid'}
        className="pattern-day-detail__action"
        onClick={() => onAddCheckIn(day.date)}
      >
        Go to day
      </IonButton>
    </IonCardContent>
  </IonCard>
)

const MonthGrid = ({
  month,
  selectedDate,
  onSelect,
}: {
  readonly month: MonthGroup
  readonly selectedDate: string | undefined
  readonly onSelect: (day: CalendarDayPattern) => void
}): React.JSX.Element => (
  <section className="pattern-calendar-month">
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
            className={cellClass(day, selectedDate === day.date)}
            aria-label={`${formatDayLabel(day.date)}: ${day.shortSummary}`}
            onClick={() => onSelect(day)}
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
)

export const CalendarContent = ({
  calendar,
  onAddCheckIn,
}: {
  readonly calendar: CalendarDayPattern[]
  readonly onAddCheckIn: (dateKey: string) => void
}): React.JSX.Element => {
  const visibleCalendar = useMemo(() => {
    const firstDataIndex = calendar.findIndex(
      (day) => day.checkInCount > 0 || day.incidentCount > 0,
    )
    return firstDataIndex < 0 ? calendar : calendar.slice(firstDataIndex)
  }, [calendar])
  const months = useMemo(() => groupByMonth(visibleCalendar), [visibleCalendar])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const selected = calendar.find((day) => day.date === selectedDate) ?? null

  return (
    <>
      <p className="patterns-lede">
        Each day is coloured by overall well-being — greener is a better day, warmer
        (redder) is a harder one. Tap a day for details, or to add a check-in.
      </p>

      {months.map((month) => (
        <MonthGrid
          key={month.key}
          month={month}
          selectedDate={selectedDate ?? undefined}
          onSelect={(day) => setSelectedDate(day.date)}
        />
      ))}

      <div className="pattern-legend">
        {(Object.keys(LEVEL_LABEL) as WellbeingLevel[]).map((level) => (
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

      <IonModal
        isOpen={selected !== null}
        initialBreakpoint={0.48}
        breakpoints={[0, 0.48, 0.85]}
        handle
        className="pattern-calendar-detail-modal"
        onDidDismiss={() => setSelectedDate(null)}
      >
        {selected && (
          <DayDetail
            day={selected}
            onAddCheckIn={(dateKey) => {
              setSelectedDate(null)
              onAddCheckIn(dateKey)
            }}
          />
        )}
      </IonModal>
    </>
  )
}

const CalendarHeatmapPage = (): React.JSX.Element => {
  const { view, isLoading, hasError } = useScopedPatterns()
  const history = useHistory()
  const { setSelectedDate } = useSelectedDate()

  const addCheckIn = (dateKey: string) => {
    setSelectedDate(dateKeyToDate(dateKey))
    history.push('/dashboard')
  }

  const emptyMessage = view?.personName
    ? `Keep logging daily check-ins for ${view.personName} and this calendar will fill in.`
    : 'We’re still gathering data. Daily check-ins will fill in this calendar.'

  return (
    <Page
      title="Calendar heatmap"
      className="patterns-page"
      backHref="/patterns"
    >
      {isLoading && <LoadingState />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && view && (
        <>
          <PatternsFilterBar />
          {view.scoredDays === 0 ? (
            <PatternsEmptyState message={emptyMessage} />
          ) : (
            <CalendarContent
              calendar={view.calendar}
              onAddCheckIn={addCheckIn}
            />
          )}
        </>
      )}
    </Page>
  )
}

export default CalendarHeatmapPage
