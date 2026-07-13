import { IonCard, IonCardContent, IonIcon } from '@ionic/react'
import { bulbOutline } from 'ionicons/icons'
import React, { useMemo, useState } from 'react'

import { Page } from '../../components/Page'
import type { HeatmapCell, Polarity } from './analytics'
import { AnalyticsLoadingSkeleton } from './components/AnalyticsLoadingSkeleton'
import { AnalyticsRefresher } from './components/AnalyticsRefresher'
import { HeatmapGrid, type HeatmapRow } from './components/HeatmapGrid'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { useScopedPatterns, type DisplayFilters } from './useScopedPatterns'

import './patterns.scss'

const WEEKDAY_PLURAL = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
]

interface SelectedCell {
  label: string
  weekday: number
  probability: number
  sampleSize: number
}

const buildRows = (
  cells: HeatmapCell[],
  polarity: Polarity,
  filters: DisplayFilters,
): { rows: HeatmapRow[]; cellIndex: Map<string, HeatmapCell[]> } => {
  const rows = new Map<string, HeatmapRow>()
  const cellIndex = new Map<string, HeatmapCell[]>()
  const allowCustom = filters.indicatorMode === 'custom'

  for (const cell of cells) {
    if (cell.polarity !== polarity) continue
    if (allowCustom && !filters.indicatorIds.includes(cell.indicatorId)) continue
    if (!rows.has(cell.indicatorId)) {
      rows.set(cell.indicatorId, {
        id: cell.indicatorId,
        label: cell.label,
        values: new Array(7).fill(null),
      })
      cellIndex.set(cell.indicatorId, [])
    }
    rows.get(cell.indicatorId)!.values[cell.weekday] = cell.probability
    cellIndex.get(cell.indicatorId)!.push(cell)
  }

  const ordered = Array.from(rows.values()).sort((a, b) => rowPeak(b) - rowPeak(a))
  return { rows: ordered, cellIndex }
}

function rowPeak(row: HeatmapRow): number {
  return row.values.reduce((max: number, v) => (v !== null && v > max ? v : max), 0)
}

const CellDetail = ({ cell }: { readonly cell: SelectedCell }): React.JSX.Element => {
  const count = Math.round((cell.probability / 100) * cell.sampleSize)
  return (
    <IonCard>
      <IonCardContent>
        <h3 className="pattern-day-detail__value">{Math.round(cell.probability)}%</h3>
        <p className="pattern-row__meta">
          {cell.label} occurred on {count} of the last {cell.sampleSize}{' '}
          {WEEKDAY_PLURAL[cell.weekday]}.
        </p>
      </IonCardContent>
    </IonCard>
  )
}

const HeatmapLegend = ({
  scale,
}: {
  readonly scale: 'rose' | 'green'
}): React.JSX.Element => (
  <div className="pattern-heatmap-legend">
    <span>Less often</span>
    <span
      className={`pattern-heatmap-legend__scale${scale === 'green' ? ' pattern-heatmap-legend__scale--green' : ''}`}
    />
    <span>More often</span>
  </div>
)

const HeatmapTip = (): React.JSX.Element => (
  <IonCard className="pattern-insight pattern-insight--neutral">
    <IonCardContent>
      <div className="pattern-insight__head">
        <IonIcon
          className="pattern-insight__icon"
          icon={bulbOutline}
          aria-hidden="true"
        />
        <h3 className="pattern-insight__title">Reading the heatmap</h3>
      </div>
      <p className="pattern-insight__detail">
        Look for darker cells — those are days of the week that may benefit from a
        little extra planning or support.
      </p>
    </IonCardContent>
  </IonCard>
)

const HeatmapContent = ({
  cells,
  filters,
}: {
  readonly cells: HeatmapCell[]
  readonly filters: DisplayFilters
}): React.JSX.Element => {
  const polarity: Polarity = filters.type === 'positive' ? 'desired' : 'undesired'
  const scale = polarity === 'desired' ? 'green' : 'rose'
  const { rows, cellIndex } = useMemo(
    () => buildRows(cells, polarity, filters),
    [cells, polarity, filters],
  )
  const [selected, setSelected] = useState<SelectedCell | null>(null)

  const select = (rowId: string, weekday: number) => {
    const cell = (cellIndex.get(rowId) ?? []).find((c) => c.weekday === weekday)
    if (cell && cell.probability !== null) {
      setSelected({
        label: cell.label,
        weekday,
        probability: cell.probability,
        sampleSize: cell.sampleSize,
      })
    }
  }

  if (rows.length === 0) {
    return (
      <PatternsEmptyState
        title="Not enough to map yet"
        message="Keep logging daily check-ins and this heatmap will fill in, one day of the week at a time."
      />
    )
  }

  return (
    <>
      <p className="patterns-lede">
        {polarity === 'desired'
          ? 'How often positive signs show up on each weekday. Greener means more often.'
          : 'How often each challenge shows up on each weekday. Darker means more often.'}{' '}
        Tap a cell for the details.
      </p>

      <IonCard>
        <IonCardContent>
          <HeatmapGrid
            rows={rows}
            scale={scale}
            onSelect={select}
          />
          <HeatmapLegend scale={scale} />
        </IonCardContent>
      </IonCard>

      {selected && <CellDetail cell={selected} />}

      <HeatmapTip />
    </>
  )
}

const HeatmapPage = (): React.JSX.Element => {
  const { view, isLoading, hasError, filters } = useScopedPatterns()

  return (
    <Page
      title="Patterns heatmap"
      className="patterns-page"
      backHref="/patterns"
    >
      <AnalyticsRefresher />
      {isLoading && <AnalyticsLoadingSkeleton />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && view && (
        <>
          <PatternsFilterBar />
          <HeatmapContent
            cells={view.timing.heatmap}
            filters={filters}
          />
        </>
      )}
    </Page>
  )
}

export default HeatmapPage
