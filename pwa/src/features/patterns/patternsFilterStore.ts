import { create } from 'zustand'

/**
 * Shared view state for the Patterns section, held in a store so it persists as
 * the caregiver moves between the various Patterns pages (Overview, Calendar,
 * Correlations, Relationships, Turning points).
 *
 *  - `selectedPersonId`: `null` means "Everyone" (household); otherwise the
 *    analytics on every page are scoped to that one person.
 *  - `showDelta`: when true, trend charts plot day-to-day *change* instead of
 *    absolute values, which makes dramatic swings jump out.
 */
interface PatternsFilterState {
  selectedPersonId: string | null
  showDelta: boolean
  setPerson: (personId: string | null) => void
  toggleDelta: () => void
}

export const usePatternsFilterStore = create<PatternsFilterState>((set) => ({
  selectedPersonId: null,
  showDelta: false,
  setPerson: (personId) => set({ selectedPersonId: personId }),
  toggleDelta: () => set((state) => ({ showDelta: !state.showDelta })),
}))
