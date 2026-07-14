import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { IonIcon } from '@ionic/react'
import {
  calendarClearOutline,
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
} from 'ionicons/icons'

import { isSameLocalDay, toLocalDateKey } from '../lib/dateKeys'
import './DateNavigator.css'
import { min } from 'date-fns'

const addDays = (d: Date, n: number): Date => {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

const buildCalendarGrid = (year: number, month: number): (Date | null)[][] => {
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
const CALENDAR_ANIMATION_MS = 240

interface DateNavigatorProps {
  date: Date
  onChange: (date: Date) => void
  /** Set of YYYY-MM-DD strings that have events (shown as dots). */
  eventDates?: Set<string>
}

interface RenderCalendarDayParams {
  day: Date | null
  dayIndex: number
  date: Date
  today: Date
  eventDates?: Set<string>
  handleDayClick: (day: Date) => void
}

const renderCalendarDay = ({
  day,
  dayIndex,
  date,
  today,
  eventDates,
  handleDayClick,
}: RenderCalendarDayParams): React.JSX.Element => {
  if (!day) {
    return (
      <span
        key={dayIndex}
        className="date-navigator__day date-navigator__day--empty"
      />
    )
  }

  const iso = toLocalDateKey(day)
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
      key={dayIndex}
      className={cellClass}
      onClick={() => handleDayClick(day)}
      disabled={isFuture}
    >
      <span className="date-navigator__day-number">{day.getDate()}</span>
      {hasEvent && <span className="date-navigator__day-dot" />}
    </button>
  )
}

interface DateNavigatorHeaderProps {
  calendarOpen: boolean
  goBack: () => void
  goForward: () => void
  goToToday: () => void
  headerLabel: string
  isToday: boolean
  today: Date
  toggleCalendar: () => void
}

const DateNavigatorHeader = ({
  calendarOpen,
  goBack,
  goForward,
  goToToday,
  headerLabel,
  isToday,
  today,
  toggleCalendar,
}: Readonly<DateNavigatorHeaderProps>): React.JSX.Element => (
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
        <IonIcon
          icon={calendarClearOutline}
          className="date-navigator__today-icon"
        />
        <span className="date-navigator__today-number">{today.getDate()}</span>
      </button>
    </div>
  </div>
)

interface DateNavigatorCalendarProps {
  calendarClosing: boolean
  calendarOpen: boolean
  calendarWeeks: (Date | null)[][]
  date: Date
  eventDates?: Set<string>
  handleDayClick: (day: Date) => void
  isFutureBlocked: boolean
  monthLabel: string
  nextMonth: () => void
  prevMonth: () => void
  today: Date
}

const DateNavigatorCalendar = ({
  calendarClosing,
  calendarOpen,
  calendarWeeks,
  date,
  eventDates,
  handleDayClick,
  isFutureBlocked,
  monthLabel,
  nextMonth,
  prevMonth,
  today,
}: Readonly<DateNavigatorCalendarProps>): React.JSX.Element | null => {
  if (!calendarOpen && !calendarClosing) return null

  return (
    <div
      className={`date-navigator__calendar${
        calendarClosing ? ' date-navigator__calendar--closing' : ''
      }`}
    >
      <div className="date-navigator__cal-header">
        <button
          className="date-navigator__cal-nav"
          onClick={prevMonth}
          aria-label="Previous month"
        >
          <IonIcon icon={chevronBackOutline} />
        </button>
        <span className="date-navigator__cal-month">{monthLabel}</span>
        <button
          className="date-navigator__cal-nav"
          onClick={nextMonth}
          disabled={isFutureBlocked}
          aria-label="Next month"
        >
          <IonIcon icon={chevronForwardOutline} />
        </button>
      </div>

      <div className="date-navigator__weekdays">
        {DAY_LABELS.map((label) => (
          <span
            key={label}
            className="date-navigator__weekday"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="date-navigator__grid">
        {calendarWeeks.map((week, wi) => (
          <div
            key={week.map((d) => d?.toISOString() ?? '').join('-')}
            className="date-navigator__week"
          >
            {week.map((day, di) =>
              renderCalendarDay({
                day,
                dayIndex: di,
                date,
                today,
                eventDates,
                handleDayClick,
              }),
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface CalendarState {
  calendarClosing: boolean
  calendarOpen: boolean
  calendarWeeks: (Date | null)[][]
  closeCalendar: () => void
  isFutureBlocked: boolean
  monthLabel: string
  nextMonth: () => void
  prevMonth: () => void
  showTodayMonth: () => void
  toggleCalendar: () => void
}

interface MonthNavigation {
  nextMonth: () => void
  prevMonth: () => void
}

const useCloseTimeoutRef = () => {
  const closeTimeout = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (closeTimeout.current !== null) {
        window.clearTimeout(closeTimeout.current)
      }
    },
    [],
  )

  return closeTimeout
}

const useMonthNavigation = (
  viewMonth: number,
  viewYear: number,
  setViewMonth: React.Dispatch<React.SetStateAction<number>>,
  setViewYear: React.Dispatch<React.SetStateAction<number>>,
  today: Date,
): MonthNavigation => {
  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m !== 0) return m - 1
      setViewYear((y) => y - 1)
      return 11
    })
  }, [setViewMonth, setViewYear])

  const nextMonth = useCallback(() => {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear
    const isFutureMonth =
      nextY > today.getFullYear() ||
      (nextY === today.getFullYear() && nextM > today.getMonth())

    if (isFutureMonth) return
    setViewMonth(nextM)
    setViewYear(nextY)
  }, [setViewMonth, setViewYear, viewMonth, viewYear, today])

  return { nextMonth, prevMonth }
}

const useCalendarState = (date: Date, today: Date): CalendarState => {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarClosing, setCalendarClosing] = useState(false)
  const [viewYear, setViewYear] = useState(date.getFullYear())
  const [viewMonth, setViewMonth] = useState(date.getMonth())
  const closeTimeout = useCloseTimeoutRef()

  const showTodayMonth = useCallback(() => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }, [today])

  const openCalendar = useCallback(() => {
    if (closeTimeout.current !== null) {
      window.clearTimeout(closeTimeout.current)
      closeTimeout.current = null
    }
    showTodayMonth()
    setCalendarClosing(false)
    setCalendarOpen(true)
  }, [showTodayMonth])

  const closeCalendar = useCallback(() => {
    setCalendarOpen(false)
    setCalendarClosing(true)
    if (closeTimeout.current !== null) {
      window.clearTimeout(closeTimeout.current)
    }
    closeTimeout.current = window.setTimeout(() => {
      setCalendarClosing(false)
      closeTimeout.current = null
    }, CALENDAR_ANIMATION_MS)
  }, [])

  const toggleCalendar = useCallback(() => {
    if (calendarOpen) closeCalendar()
    else openCalendar()
  }, [calendarOpen, closeCalendar, openCalendar])

  const { nextMonth, prevMonth } = useMonthNavigation(
    viewMonth,
    viewYear,
    setViewMonth,
    setViewYear,
    today,
  )

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

  return {
    calendarClosing,
    calendarOpen,
    calendarWeeks,
    closeCalendar,
    isFutureBlocked,
    monthLabel,
    nextMonth,
    prevMonth,
    showTodayMonth,
    toggleCalendar,
  }
}

interface DayNavigation {
  goBack: () => void
  goForward: () => void
  goToToday: () => void
  handleDayClick: (day: Date) => void
}

const useDayNavigation = (
  date: Date,
  onChange: (date: Date) => void,
  today: Date,
  closeCalendar: () => void,
  showTodayMonth: () => void,
): DayNavigation => {
  const goBack = useCallback(() => onChange(addDays(date, -1)), [date, onChange])
  const goForward = useCallback(() => {
    if (!isSameLocalDay(date, today)) onChange(min([addDays(date, 1), today]))
  }, [date, onChange, today])

  const goToToday = useCallback(() => {
    onChange(today)
    showTodayMonth()
  }, [onChange, showTodayMonth, today])

  const handleDayClick = useCallback(
    (day: Date) => {
      if (day > today) return
      onChange(day)
      closeCalendar()
    },
    [closeCalendar, onChange, today],
  )

  return { goBack, goForward, goToToday, handleDayClick }
}

const getHeaderLabel = (date: Date, today: Date): string => {
  if (isSameLocalDay(date, today)) return 'Today'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export const useDateNavigator = ({
  date,
  onChange,
  eventDates,
}: DateNavigatorProps): {
  headerElement: React.JSX.Element
  calendarElement: React.JSX.Element | null
} => {
  const today = new Date()
  const isToday = isSameLocalDay(date, today)
  const calendarState = useCalendarState(date, today)
  const dayNavigation = useDayNavigation(
    date,
    onChange,
    today,
    calendarState.closeCalendar,
    calendarState.showTodayMonth,
  )

  const headerElement = (
    <DateNavigatorHeader
      calendarOpen={calendarState.calendarOpen}
      goBack={dayNavigation.goBack}
      goForward={dayNavigation.goForward}
      goToToday={dayNavigation.goToToday}
      headerLabel={getHeaderLabel(date, today)}
      isToday={isToday}
      today={today}
      toggleCalendar={calendarState.toggleCalendar}
    />
  )

  const calendarElement = (
    <DateNavigatorCalendar
      calendarClosing={calendarState.calendarClosing}
      calendarOpen={calendarState.calendarOpen}
      calendarWeeks={calendarState.calendarWeeks}
      date={date}
      eventDates={eventDates}
      handleDayClick={dayNavigation.handleDayClick}
      isFutureBlocked={calendarState.isFutureBlocked}
      monthLabel={calendarState.monthLabel}
      nextMonth={calendarState.nextMonth}
      prevMonth={calendarState.prevMonth}
      today={today}
    />
  )

  return { headerElement, calendarElement }
}
