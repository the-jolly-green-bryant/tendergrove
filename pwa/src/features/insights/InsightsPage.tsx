import React, { useMemo } from 'react'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import {
  PersonFilterChips,
  type FilterablePerson,
  usePersonFilter,
} from '../../components/PersonFilterChips'
import { usePeople } from '../people/usePeople'
import { parseAnswers } from '../people/checkin/checkInUtils'

import './InsightsPage.css'
import { not } from '../../lib/helpers'
import { RawPerson } from '../patterns/analytics'
import { LoadErrorState } from '../../components/LoadErrorState'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DayBucket {
  dateKey: string
  day: number
  good: number
  bad: number
}

interface MonthGroup {
  label: string
  days: DayBucket[]
}

interface DayCounts {
  good: number
  bad: number
}

interface ScoreableIndicator {
  id: string
  polarity?: string | null
}

interface RenderPageParams {
  activePeople: RawPerson[]
  clearSelection: () => void
  hasError: boolean
  isLoading: boolean
  maxTotal: number
  monthGroups: MonthGroup[]
  selectedPeople: Set<string>
  selectOnlyPerson: (personId: string) => void
  retry: () => void
  showingSavedCopy: boolean
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toDateKey = (iso: string): string => {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const toMonthKey = (dateKey: string): string => dateKey.slice(0, 7) // "YYYY-MM"

const formatMonthLabel = (monthKey: string): string => {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const LOADING_STATE = (
  <LoadingState
    className="insights-loading"
    variant="chart"
    label="Loading insights"
  />
)

const EMPTY_STATE = (
  <div className="insights-empty">
    <p>No check-in data yet.</p>
    <p className="insights-empty__hint">
      Daily check-ins will appear here as a bar chart once recorded.
    </p>
  </div>
)

const renderPage = ({
  activePeople,
  clearSelection,
  hasError,
  isLoading,
  maxTotal,
  monthGroups,
  selectedPeople,
  selectOnlyPerson,
  retry,
  showingSavedCopy,
}: RenderPageParams): React.JSX.Element => (
  <Page
    title="Insights"
    backHref="/dashboard"
  >
    {isLoading && LOADING_STATE}
    {hasError && <LoadErrorState noun="your insights" onRetry={retry} showingSavedCopy={showingSavedCopy} />}

    {!isLoading && (!hasError || showingSavedCopy) && (
      <>
        <PersonFilterChips
          people={activePeople}
          selectedPeople={selectedPeople}
          onSelectPerson={selectOnlyPerson}
          onClear={clearSelection}
        />

        {monthGroups.length === 0 ? (
          EMPTY_STATE
        ) : (
          <div className="insights-months">
            {monthGroups.map((month) => (
              <div key={month.label}>
                <h3 className="insights-month__heading">{month.label}</h3>

                {month.days.map((day) => (
                  <div
                    key={day.dateKey}
                    className="insights-day"
                  >
                    <span className="insights-day__label">{day.day}</span>

                    <div className="insights-day__bar-track">
                      {(['bad', 'good'] as const).map((k) => {
                        const val = day[k]
                        return (
                          val > 0 && (
                            <div
                              key={k}
                              className={`insights-day__bar--${k}`}
                              style={{ width: `${(val / maxTotal) * 100}%` }}
                              title={`${val} bad`}
                            />
                          )
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </>
    )}
  </Page>
)

const useMonthGroups = (dayBuckets: Map<string, DayCounts>): MonthGroup[] =>
  useMemo(() => {
    const months = new Map<string, DayBucket[]>()

    for (const [dateKey, counts] of dayBuckets) {
      const mk = toMonthKey(dateKey)
      if (!months.has(mk)) months.set(mk, [])
      months.get(mk)!.push({
        dateKey,
        day: Number(dateKey.slice(8, 10)),
        good: counts.good,
        bad: counts.bad,
      })
    }

    for (const days of months.values()) {
      days.sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    }

    return Array.from(months.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mk, days]) => ({
        label: formatMonthLabel(mk),
        days,
      }))
  }, [dayBuckets])

const useMaxTotal = (dayBuckets: Map<string, DayCounts>): number =>
  useMemo(
    () =>
      Math.max(...Array.from(dayBuckets.values()).map(({ good, bad }) => good + bad)) ||
      1,
    [dayBuckets],
  )

const InsightsPage = (): React.JSX.Element => {
  const people = usePeople()
  const { selectedPeople, selectOnlyPerson, clearSelection } = usePersonFilter()

  const activePeople: RawPerson[] = useMemo(
    () => (people.data ?? []).filter((p: RawPerson) => !p.archived),
    [people.data],
  )

  const dayBuckets = useMemo(() => {
    const buckets = new Map<string, DayCounts>()

    const filtered =
      selectedPeople.size > 0
        ? activePeople.filter((p) => selectedPeople.has(p.id))
        : activePeople

    for (const person of filtered) {
      const indicators = (person.indicators ?? []).filter((i) => i.active !== false)
      if (indicators.length === 0) continue

      for (const ci of person.checkIns ?? []) {
        const checked = new Set(parseAnswers(ci.answersJson).checked)
        const key = toDateKey(ci.occurredAt)

        const isGood = (indicator: ScoreableIndicator) => {
          const wasChecked = checked.has(indicator.id)
          const isDesired = indicator.polarity === 'desired'
          return (isDesired && wasChecked) || (!isDesired && !wasChecked)
        }

        const existing = buckets.get(key) ?? { good: 0, bad: 0 }
        buckets.set(key, {
          good: existing.good + indicators.filter(isGood).length,
          bad: existing.bad + indicators.filter(not(isGood)).length,
        })
      }
    }

    return buckets
  }, [activePeople, selectedPeople])

  const monthGroups = useMonthGroups(dayBuckets)
  const maxTotal = useMaxTotal(dayBuckets)

  return renderPage({
    activePeople,
    clearSelection,
    hasError: Boolean(people.error),
    isLoading: people.isLoading,
    maxTotal,
    monthGroups,
    selectedPeople,
    selectOnlyPerson,
    retry: () => void people.refetch(),
    showingSavedCopy: Boolean(people.data),
  })
}

export default InsightsPage
