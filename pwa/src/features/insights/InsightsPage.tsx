import { useMemo } from 'react'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import { PersonFilterChips, usePersonFilter } from '../../components/PersonFilterChips'
import { usePeople } from '../people/usePeople'
import { parseAnswers } from '../people/checkin/checkInUtils'

import './InsightsPage.css'
import { not } from '../../lib/helpers'

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7) // "YYYY-MM"
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const LOADING_STATE = <LoadingState className="insights-loading" />

const EMPTY_STATE = (
  <div className="insights-empty">
    <p>No check-in data yet.</p>
    <p className="insights-empty__hint">
      Daily check-ins will appear here as a bar chart once recorded.
    </p>
  </div>
)

/**
 * Renders insights for selected people in a format that lends itself to pattern
 *  recognition.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function InsightsPage() {
  const people = usePeople()
  const { selectedPeople, togglePerson, clearSelection } = usePersonFilter()

  const activePeople = useMemo(
    () => (people.data ?? []).filter((p) => !p.archived),
    [people.data],
  )

  /* Aggregate good / bad counts per day across selected people */
  const dayBuckets = useMemo(() => {
    const buckets = new Map<string, { good: number; bad: number }>()

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

        const isGood = (indicator) => {
          const wasChecked = checked.has(indicator.id)
          const isDesired = indicator.polarity === 'desired'
          return (isDesired && wasChecked) || (!isDesired && !wasChecked)
        }

        const good = indicators.filter(isGood).length
        const bad = indicators.filter(not(isGood)).length
        const existing = buckets.get(key) ?? { good: 0, bad: 0 }
        buckets.set(key, {
          good: existing.good + good,
          bad: existing.bad + bad,
        })
      }
    }

    return buckets
  }, [activePeople, selectedPeople])

  /* Group by month, sort descending */
  const monthGroups: MonthGroup[] = useMemo(() => {
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

    // Sort days within each month descending
    for (const days of months.values()) {
      days.sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    }

    // Sort months descending
    return Array.from(months.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mk, days]) => ({
        label: formatMonthLabel(mk),
        days,
      }))
  }, [dayBuckets])

  /* Find the max total (good + bad) across all days to scale bars */
  const maxTotal = useMemo(
    () =>
      Math.max(...Array.from(dayBuckets.values()).map(({ good, bad }) => good + bad)) ||
      1,
    [dayBuckets],
  )

  return (
    <Page title="Insights">
      {people.isLoading && LOADING_STATE}
      {people.error && <p>Failed to load data.</p>}

      {!people.isLoading && !people.error && (
        <>
          <PersonFilterChips
            people={activePeople}
            selectedPeople={selectedPeople}
            onToggle={togglePerson}
            onClear={clearSelection}
            className="person-filter-chips"
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
                          console.log('maxTotal', maxTotal)
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
}
