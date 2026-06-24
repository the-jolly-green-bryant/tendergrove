import { useState, useRef, useCallback, useMemo } from 'react'
import { IonIcon } from '@ionic/react'
import {
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
} from 'ionicons/icons'

import './DateNavigator.css'

/** Return YYYY-MM-DD for a Date in local time. */
function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const addDays = (d: Date, n: number): Date => {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

/** Build a 6-row calendar grid for the given month. */
function buildCalendarGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const startDow = firstDay.getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const weeks: (Date | null)[][] = []
  let currentDay = 1 - startDow // may be negative for leading blanks

  for (let w = 0; w < 6; w++) {
    const week: (Date | null)[] = []
    for (let d = 0; d < 7; d++) {
      week.push(
        currentDay < 1 || currentDay > daysInMonth
          ? null
          : new Date(year, month, currentDay),
      )
      currentDay++
    }
    // Skip entirely empty trailing weeks
    if (week.every((d) => d === null) && w > 0) break
    weeks.push(week)
  }

  return weeks
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface DateNavigatorProps {
  date: Date
  onChange: (date: Date) => void
  /** Set of YYYY-MM-DD strings that have events (shown as dots). */
  eventDates?: Set<string>
}

export function useDateNavigator({ date, onChange, eventDates }: DateNavigatorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const today = new Date()

  // The calendar shows a specific month (may differ from selected date when navigating months)
  const [viewYear, setViewYear] = useState(date.getFullYear())
  const [viewMonth, setViewMonth] = useState(date.getMonth())

  // Swipe handling
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const swiped = useRef(false)

  const goBack = useCallback(() => {
    onChange(addDays(date, -1))
  }, [date, onChange])

  const goForward = useCallback(() => {
    if (isSameLocalDay(date, today)) {
      return
    }

    const next = addDays(date, 1)
    onChange(next <= today ? next : today)
  }, [date, onChange, today])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    swiped.current = false
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (
        touchStartX.current === null ||
        touchStartY.current === null ||
        swiped.current
      )
        return

      const deltaX = e.changedTouches[0].clientX - touchStartX.current
      const deltaY = e.changedTouches[0].clientY - touchStartY.current

      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        swiped.current = true
        if (deltaX > 0) {
          goBack()
        } else {
          goForward()
        }
      }

      touchStartX.current = null
      touchStartY.current = null
    },
    [goBack, goForward],
  )

  const toggleCalendar = useCallback(() => {
    if (!calendarOpen) {
      // Sync calendar view to currently selected date
      setViewYear(date.getFullYear())
      setViewMonth(date.getMonth())
    }
    setCalendarOpen((prev) => !prev)
  }, [calendarOpen, date])

  const goToToday = useCallback(() => {
    const t = new Date()
    onChange(t)
    setViewYear(t.getFullYear())
    setViewMonth(t.getMonth())
  }, [onChange])

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    // Don't allow navigating past the current month
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear
    if (
      nextY > today.getFullYear() ||
      (nextY === today.getFullYear() && nextM > today.getMonth())
    ) {
      return
    }
    setViewMonth(nextM)
    setViewYear(nextY)
  }, [viewMonth, viewYear, today])

  const calendarWeeks = useMemo(
    () => buildCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  )

  const isFutureBlocked =
    viewYear === today.getFullYear() && viewMonth === today.getMonth()

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  // Header label: show "Today", "Yesterday", or formatted date
  const isToday = isSameLocalDay(date, today)
  const isYesterday = isSameLocalDay(date, addDays(today, -1))
  const headerLabel = isToday
    ? 'Today'
    : isYesterday
      ? 'Yesterday'
      : date.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })

  const handleDayClick = useCallback(
    (day: Date) => {
      // Don't select future dates
      if (day > today) return
      onChange(day)
      setCalendarOpen(false)
    },
    [onChange, today],
  )

  const headerElement = (
    <div className="date-navigator__header">
      <button
        className="date-navigator__month-btn"
        onClick={toggleCalendar}
        aria-label="Toggle calendar"
      >
        <span className="date-navigator__month-label">{headerLabel}</span>
        <IonIcon
          icon={calendarOpen ? chevronUpOutline : chevronDownOutline}
          className="date-navigator__chevron"
        />
      </button>

      <div className="date-navigator__controls">
        <button
          className="date-navigator__arrow"
          onClick={goBack}
          aria-label="Previous day"
        >
          <IonIcon icon={chevronBackOutline} />
        </button>
        <button
          className="date-navigator__arrow"
          onClick={goForward}
          disabled={isToday}
          aria-label="Next day"
        >
          <IonIcon icon={chevronForwardOutline} />
        </button>
        <button
          className="date-navigator__today-btn"
          onClick={goToToday}
          aria-label="Go to today"
        >
          <span className="date-navigator__today-number">{today.getDate()}</span>
        </button>
      </div>
    </div>
  )

  const calendarElement = calendarOpen ? (
    <div
      className="date-navigator__calendar"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Calendar month navigation */}
      <div className="date-navigator__cal-header">
        <button
          className="date-navigator__cal-nav"
          onClick={prevMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="date-navigator__cal-month">{monthLabel}</span>
        <button
          className="date-navigator__cal-nav"
          onClick={nextMonth}
          disabled={isFutureBlocked}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="date-navigator__weekdays">
        {DAY_LABELS.map((label, i) => (
          <span
            key={i}
            className="date-navigator__weekday"
          >
            {label}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="date-navigator__grid">
        {calendarWeeks.map((week, wi) => (
          <div
            key={wi}
            className="date-navigator__week"
          >
            {week.map((day, di) => {
              if (!day) {
                return (
                  <span
                    key={di}
                    className="date-navigator__day date-navigator__day--empty"
                  />
                )
              }

              const iso = toISODate(day)
              const isSelected = isSameLocalDay(day, date)
              const isTodayCell = isSameLocalDay(day, today)
              const isFuture = day > today
              const hasEvent = eventDates?.has(iso) ?? false

              let cellClass = 'date-navigator__day'
              if (isSelected) cellClass += ' date-navigator__day--selected'
              if (isTodayCell && !isSelected) cellClass += ' date-navigator__day--today'
              if (isFuture) cellClass += ' date-navigator__day--disabled'

              return (
                <button
                  key={di}
                  className={cellClass}
                  onClick={() => handleDayClick(day)}
                  disabled={isFuture}
                >
                  <span className="date-navigator__day-number">{day.getDate()}</span>
                  {hasEvent && <span className="date-navigator__day-dot" />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  ) : null

  return { headerElement, calendarElement }
}
