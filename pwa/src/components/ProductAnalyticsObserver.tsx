import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { useAppAuth } from '../auth/AuthContext'
import { usePeople } from '../features/people/usePeople'
import {
  buildHouseholdProfile,
  screenNameForPath,
  trackProductEvent,
} from '../lib/productAnalytics'

export const ProductAnalyticsObserver = () => {
  const { user } = useAppAuth()
  const location = useLocation()
  const people = usePeople()
  const lastScreen = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    const screen = screenNameForPath(location.pathname)
    if (lastScreen.current === screen) return
    lastScreen.current = screen
    void trackProductEvent('screen_viewed', { screen })
  }, [location.pathname, user])

  useEffect(() => {
    if (!user || !people.data) return
    const date = new Date().toISOString().slice(0, 10)
    const storageKey = `grove:analytics:household-profile:${user.userId}:${date}`
    try {
      if (localStorage.getItem(storageKey)) return
      localStorage.setItem(storageKey, 'pending')
    } catch {
      // Continue without deduplication when device storage is unavailable.
    }
    void trackProductEvent(
      'household_profile',
      buildHouseholdProfile(people.data),
    )
  }, [people.data, user])

  return null
}
