import { createContext, useContext, useState, type ReactNode } from 'react'

interface SelectedDateContextValue {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
}

const SelectedDateContext = createContext<SelectedDateContextValue | null>(null)

/**
 *
 */
export function SelectedDateProvider({ children }: { readonly children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  return (
    <SelectedDateContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </SelectedDateContext.Provider>
  )
}

/**
 *
 */
export function useSelectedDate(): SelectedDateContextValue {
  const ctx = useContext(SelectedDateContext)
  if (!ctx) {
    throw new Error('useSelectedDate must be used within a SelectedDateProvider')
  }
  return ctx
}
