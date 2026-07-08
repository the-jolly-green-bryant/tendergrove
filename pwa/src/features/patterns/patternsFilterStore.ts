import { create } from 'zustand'

/** Which indicator sentiment a page should emphasise. */
export type AnalyticsType = 'all' | 'challenges' | 'positive'

/** A custom date range as inclusive local day keys (YYYY-MM-DD). */
export interface CustomRange {
  start: string
  end: string
}

/**
 * Shared view/filter state for the Patterns section, in a store so it persists
 * as the caregiver moves between pages (Overview, Trends, Heatmap, Correlations,
 * Insights, Calendar, …) and from the Filters page.
 *
 *  - `personIds`: empty means Everyone (household); one id scopes to a person;
 *    several restrict the household to that subset.
 *  - `rangeDays` / `customRange`: the analysis window.
 *  - `type` / `indicatorMode` / `indicatorIds`: display filters for the timing,
 *    heatmap and correlation pages (they never change the core well-being score).
 *  - `showDelta`: trend charts plot day-to-day change instead of absolute values.
 */
interface PatternsFilterState {
  personIds: string[]
  rangeDays: number
  customRange: CustomRange | null
  type: AnalyticsType
  indicatorMode: 'all' | 'custom'
  indicatorIds: string[]
  showDelta: boolean

  /** Select exactly one person (chip bar), or clear to Everyone with null/[]. */
  setPerson: (personId: string | null) => void
  setPersonIds: (personIds: string[]) => void
  setRangeDays: (rangeDays: number) => void
  setCustomRange: (range: CustomRange | null) => void
  setType: (type: AnalyticsType) => void
  setIndicatorMode: (mode: 'all' | 'custom') => void
  setIndicatorIds: (indicatorIds: string[]) => void
  toggleDelta: () => void
  reset: () => void
}

const DEFAULTS = {
  personIds: [] as string[],
  rangeDays: 30,
  customRange: null as CustomRange | null,
  type: 'all' as AnalyticsType,
  indicatorMode: 'all' as 'all' | 'custom',
  indicatorIds: [] as string[],
  showDelta: false,
}

export const usePatternsFilterStore = create<PatternsFilterState>((set) => ({
  ...DEFAULTS,
  setPerson: (personId) => set({ personIds: personId ? [personId] : [] }),
  setPersonIds: (personIds) => set({ personIds }),
  setRangeDays: (rangeDays) => set({ rangeDays, customRange: null }),
  setCustomRange: (customRange) => set({ customRange }),
  setType: (type) => set({ type }),
  setIndicatorMode: (indicatorMode) => set({ indicatorMode }),
  setIndicatorIds: (indicatorIds) => set({ indicatorIds }),
  toggleDelta: () => set((state) => ({ showDelta: !state.showDelta })),
  reset: () => set({ ...DEFAULTS }),
}))
