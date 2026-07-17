import { IonIcon } from '@ionic/react'
import {
  calendarNumberOutline,
  gitNetworkOutline,
  pulseOutline,
  triangleOutline,
  trailSignOutline,
} from 'ionicons/icons'
import React from 'react'
import { useHistory, useLocation } from 'react-router-dom'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import { PersonAvatar } from '../../components/PersonAvatar'
import { useSelectedDate } from '../../context/SelectedDateContext'
import type {
  AnomalyOtherPersonItem,
  HouseholdSeverityOverlap,
  IndicatorOverlap,
  IndicatorSignal,
  ScopedPatternsView,
} from './analytics'
import { dateKeyToDate } from './analytics/dateUtils'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { PeriodSelector } from './components/PeriodSelector'
import { TrendChartPanel } from './components/TrendChartPanel'
import { usePatternsFilterStore } from './patternsFilterStore'
import { useScopedPatterns } from './useScopedPatterns'
import { CalendarContent } from './CalendarHeatmapPage'
import { TurningPointsContent } from './TurningPointsPage'

import './patterns.scss'

type PatternsTab = 'trend' | 'calendar' | 'household' | 'turning-points'

const TABS: Array<{ id: PatternsTab; label: string; icon: string }> = [
  { id: 'trend', label: 'Trend', icon: pulseOutline },
  { id: 'calendar', label: 'Calendar', icon: calendarNumberOutline },
  { id: 'household', label: 'Household', icon: gitNetworkOutline },
  { id: 'turning-points', label: 'Shifts', icon: trailSignOutline },
]

const usePatternsTab = (): [PatternsTab, (tab: PatternsTab) => void] => {
  const location = useLocation()
  const history = useHistory()
  const requested = new URLSearchParams(location.search).get(
    'tab',
  ) as PatternsTab | null
  const active = TABS.some((tab) => tab.id === requested) ? requested! : 'trend'

  return [
    active,
    (tab) => {
      const params = new URLSearchParams(location.search)
      params.set('tab', tab)
      history.replace({ ...location, search: params.toString() })
    },
  ]
}

const PatternsTabs = ({
  active,
  onChange,
}: {
  active: PatternsTab
  onChange: (tab: PatternsTab) => void
}) => (
  <nav
    className="patterns-tabs"
    aria-label="Pattern views"
  >
    {TABS.map((tab) => (
      <button
        key={tab.id}
        type="button"
        className={`patterns-tabs__item${active === tab.id ? ' patterns-tabs__item--active' : ''}`}
        aria-current={active === tab.id ? 'page' : undefined}
        onClick={() => onChange(tab.id)}
      >
        <IonIcon
          icon={tab.icon}
          aria-hidden="true"
        />
        <span>{tab.label}</span>
      </button>
    ))}
  </nav>
)

const TrendView = ({
  view,
  showDelta,
}: {
  view: ScopedPatternsView
  showDelta: boolean
}) => {
  const rangeDays = usePatternsFilterStore((state) => state.rangeDays)
  const setRangeDays = usePatternsFilterStore((state) => state.setRangeDays)
  const toggleDelta = usePatternsFilterStore((state) => state.toggleDelta)
  return (
    <>
      <TrendChartPanel
        points={view.trend.points}
        rangeDays={rangeDays}
        showDelta={showDelta}
        className="pattern-overview-chart"
        action={
          <button
            type="button"
            className={`pattern-delta-toggle${showDelta ? ' pattern-delta-toggle--active' : ''}`}
            onClick={toggleDelta}
            aria-pressed={showDelta}
          >
            <IonIcon
              icon={triangleOutline}
              aria-hidden="true"
            />
            Delta
          </button>
        }
        controls={
          <div className="pattern-overview-chart__period">
            <PeriodSelector
              value={rangeDays}
              onChange={setRangeDays}
            />
          </div>
        }
      />
    </>
  )
}

const HouseholdChord = ({ overlaps }: { overlaps: HouseholdSeverityOverlap[] }) => {
  const names = [
    ...new Set(overlaps.flatMap((item) => [item.personAName, item.personBName])),
  ]
  const positions = new Map(
    names.map((name, index) => {
      const angle = (index / Math.max(1, names.length)) * Math.PI * 2 - Math.PI / 2
      return [
        name,
        { x: 160 + Math.cos(angle) * 112, y: 150 + Math.sin(angle) * 108 },
      ] as const
    }),
  )
  const maxOverlap = Math.max(
    1,
    ...overlaps.flatMap((item) => [item.overlapDays, item.goodOverlapDays]),
  )

  return (
    <div className="household-chord">
      <svg
        viewBox="0 0 320 300"
        role="img"
        aria-label="Household good-day and severe-day overlap"
      >
        {overlaps.flatMap((item) => {
          const a = positions.get(item.personAName)!
          const b = positions.get(item.personBName)!
          return [
            item.overlapDays > 0 && (
              <path
                key={`${item.personAId}-${item.personBId}-bad`}
                d={`M${a.x},${a.y} Q150,135 ${b.x},${b.y}`}
                className="household-chord__link household-chord__link--bad"
                strokeWidth={2 + (item.overlapDays / maxOverlap) * 12}
              >
                <title>{item.overlapDays} overlapping severe days</title>
              </path>
            ),
            item.goodOverlapDays > 0 && (
              <path
                key={`${item.personAId}-${item.personBId}-good`}
                d={`M${a.x},${a.y} Q170,165 ${b.x},${b.y}`}
                className="household-chord__link household-chord__link--good"
                strokeWidth={2 + (item.goodOverlapDays / maxOverlap) * 12}
              >
                <title>{item.goodOverlapDays} overlapping good days</title>
              </path>
            ),
          ]
        })}
        {names.map((name) => {
          const point = positions.get(name)!
          return (
            <g
              key={name}
              transform={`translate(${point.x} ${point.y})`}
            >
              <circle
                r="29"
                className="household-chord__node"
              />
              <text
                textAnchor="middle"
                dy="4"
              >
                {name.slice(0, 10)}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="household-chord__legend">
        <span>
          <i className="household-chord__bad" /> Severe days overlap
        </span>
        <span>
          <i className="household-chord__good" /> Good days overlap
        </span>
      </div>
    </div>
  )
}

const SignalNetwork = ({ overlaps }: { overlaps: IndicatorOverlap[] }) => {
  const nodes = [
    ...new Map(
      overlaps.flatMap((item) => [
        [
          `${item.sourcePersonId}:${item.sourceIndicatorId}`,
          {
            id: `${item.sourcePersonId}:${item.sourceIndicatorId}`,
            person: item.sourcePersonName,
            label: item.sourceIndicatorName,
          },
        ],
        [
          `${item.targetPersonId}:${item.targetIndicatorId}`,
          {
            id: `${item.targetPersonId}:${item.targetIndicatorId}`,
            person: item.targetPersonName,
            label: item.targetIndicatorName,
          },
        ],
      ]),
    ).values(),
  ]
  const people = [...new Set(nodes.map((node) => node.person))].sort()
  const ordered = people.flatMap((person) =>
    nodes
      .filter((node) => node.person === person)
      .sort((a, b) => a.label.localeCompare(b.label)),
  )
  const positions = new Map(
    ordered.map((node, index) => {
      const angle = (index / Math.max(1, ordered.length)) * Math.PI * 2 - Math.PI / 2
      return [
        node.id,
        { x: 180 + Math.cos(angle) * 142, y: 180 + Math.sin(angle) * 142, angle },
      ] as const
    }),
  )
  const palette = ['#c94b4b', '#467f78', '#7b5ebf', '#d18a3f', '#4e79a7']
  const personColor = new Map(
    people.map((person, index) => [person, palette[index % palette.length]]),
  )
  const max = Math.max(1, ...overlaps.map((item) => item.overlapDays))

  return (
    <div className="signal-network">
      <svg
        viewBox="0 0 360 360"
        role="img"
        aria-label="Undesired signal overlap network"
      >
        {overlaps.map((item) => {
          const source = positions.get(
            `${item.sourcePersonId}:${item.sourceIndicatorId}`,
          )!
          const target = positions.get(
            `${item.targetPersonId}:${item.targetIndicatorId}`,
          )!
          return (
            <path
              key={`${item.sourcePersonId}:${item.sourceIndicatorId}-${item.targetPersonId}:${item.targetIndicatorId}`}
              d={`M${source.x},${source.y} Q180,180 ${target.x},${target.y}`}
              fill="none"
              stroke={personColor.get(item.sourcePersonName)}
              strokeOpacity={0.18 + (item.overlapDays / max) * 0.58}
              strokeWidth={1 + (item.overlapDays / max) * 6}
            >
              <title>
                {item.sourcePersonName}: {item.sourceIndicatorName} ↔{' '}
                {item.targetPersonName}: {item.targetIndicatorName} · {item.overlapDays}{' '}
                days
              </title>
            </path>
          )
        })}
        {ordered.map((node) => {
          const point = positions.get(node.id)!
          return (
            <g key={node.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill={personColor.get(node.person)}
              >
                <title>
                  {node.person}: {node.label}
                </title>
              </circle>
            </g>
          )
        })}
        <circle
          cx="180"
          cy="180"
          r="34"
          className="signal-network__center"
        />
        <text
          x="180"
          y="176"
          textAnchor="middle"
        >
          SIGNAL
        </text>
        <text
          x="180"
          y="191"
          textAnchor="middle"
        >
          OVERLAP
        </text>
      </svg>
      <div className="signal-network__legend">
        {people.map((person) => (
          <span key={person}>
            <i style={{ background: personColor.get(person) }} />
            {person}
          </span>
        ))}
      </div>
    </div>
  )
}

const SignalArcNetwork = ({
  overlaps,
  signals,
}: {
  overlaps: IndicatorOverlap[]
  signals: IndicatorSignal[]
}) => {
  const people = [
    ...new Map(
      signals.map((signal) => [
        signal.personId,
        {
          id: signal.personId,
          name: signal.personName,
          avatarUrl: signal.avatarUrl,
        },
      ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name))
  const nodes = signals.map((signal) => ({
    id: `${signal.personId}:${signal.indicatorId}`,
    personId: signal.personId,
    label: signal.indicatorName,
    polarity: signal.polarity,
  }))
  const polar = (angle: number, radius: number) => ({
    x: 180 + Math.cos(angle) * radius,
    y: 180 + Math.sin(angle) * radius,
  })
  const arcPath = (start: number, end: number, radius: number) => {
    const a = polar(start, radius)
    const b = polar(end, radius)
    return `M${a.x},${a.y} A${radius},${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${b.x},${b.y}`
  }
  const gap = 0.12
  const segment = (Math.PI * 2) / Math.max(1, people.length)
  const nodePositions = new Map<string, { x: number; y: number }>()
  const personArcs = people.map((person, personIndex) => {
    const start = -Math.PI / 2 + personIndex * segment + gap
    const end = -Math.PI / 2 + (personIndex + 1) * segment - gap
    const personNodes = nodes.filter((node) => node.personId === person.id)
    const desired = personNodes
      .filter((node) => node.polarity === 'desired')
      .sort((a, b) => a.label.localeCompare(b.label))
    const undesired = personNodes
      .filter((node) => node.polarity === 'undesired')
      .sort((a, b) => a.label.localeCompare(b.label))
    const interspersed = Array.from(
      { length: Math.max(desired.length, undesired.length) },
      (_, index) => [undesired[index], desired[index]],
    ).flatMap((pair) => pair.filter((node) => node !== undefined))
    interspersed.forEach((node, index) => {
      const fraction = (index + 1) / (interspersed.length + 1)
      nodePositions.set(node.id, polar(start + (end - start) * fraction, 132))
    })
    return { person, start, end, mid: (start + end) / 2 }
  })
  const visibleOverlaps = overlaps.filter(
    (item) =>
      nodePositions.has(`${item.sourcePersonId}:${item.sourceIndicatorId}`) &&
      nodePositions.has(`${item.targetPersonId}:${item.targetIndicatorId}`),
  )
  const max = Math.max(1, ...visibleOverlaps.map((item) => item.overlapDays))

  return (
    <div className="signal-network signal-arc-network">
      <svg
        viewBox="0 0 360 360"
        role="img"
        aria-label="Positive and negative signal overlap by household member"
      >
        {visibleOverlaps.map((item) => {
          const source = nodePositions.get(
            `${item.sourcePersonId}:${item.sourceIndicatorId}`,
          )!
          const target = nodePositions.get(
            `${item.targetPersonId}:${item.targetIndicatorId}`,
          )!
          const intensity = item.overlapDays / max
          const color = item.polarity === 'desired' ? '#3f965d' : '#c93030'
          return (
            <path
              key={`${item.sourcePersonId}:${item.sourceIndicatorId}-${item.targetPersonId}:${item.targetIndicatorId}`}
              d={`M${source.x},${source.y} Q180,180 ${target.x},${target.y}`}
              fill="none"
              stroke={color}
              strokeOpacity={0.08 + intensity * 0.82}
              strokeWidth="3.5"
            >
              <title>
                {item.sourcePersonName}: {item.sourceIndicatorName} ↔{' '}
                {item.targetPersonName}: {item.targetIndicatorName} · {item.overlapDays}{' '}
                days
              </title>
            </path>
          )
        })}
        {personArcs.map(({ person, start, end, mid }) => {
          const avatar = polar(mid, 158)
          return (
            <g key={person.id}>
              <path
                d={arcPath(start, end, 132)}
                className="signal-arc-network__bar"
              />
              <foreignObject
                x={avatar.x - 18}
                y={avatar.y - 18}
                width="36"
                height="36"
              >
                <div className="signal-arc-network__avatar-wrap">
                  <PersonAvatar
                    className="signal-arc-network__avatar"
                    name={person.name}
                    src={person.avatarUrl}
                  />
                </div>
              </foreignObject>
              <title>{person.name}</title>
            </g>
          )
        })}
        {nodes.map((node) => {
          const point = nodePositions.get(node.id)!
          return (
            <circle
              key={node.id}
              cx={point.x}
              cy={point.y}
              r="3.5"
              className={`signal-arc-network__tick signal-arc-network__tick--${node.polarity}`}
            >
              <title>{node.label}</title>
            </circle>
          )
        })}
      </svg>
      <div className="signal-arc-network__legend">
        <span>
          <i className="signal-arc-network__legend-red" /> Shared negative signals
        </span>
        <span>
          <i className="signal-arc-network__legend-green" /> Shared positive signals
        </span>
      </div>
    </div>
  )
}

const HouseholdView = ({ view }: { view: ScopedPatternsView }) => {
  const breakdown = view.anomalyPatterns?.otherPeople?.items ?? []
  if (view.indicatorSignals.length === 0 && breakdown.length === 0) {
    return (
      <PatternsEmptyState
        title="No household overlap yet"
        message="More check-ins on the same days will make household connections visible here."
      />
    )
  }
  return (
    <>
      {view.indicatorSignals.length > 0 && (
        <section className="signal-overlap-section">
          <p className="patterns-eyebrow">Signal connections</p>
          <h2>Positive and negative signals that overlap</h2>
          <SignalArcNetwork
            overlaps={view.indicatorOverlaps}
            signals={view.indicatorSignals}
          />
        </section>
      )}
      {breakdown.length > 0 && (
        <section className="household-breakdown">
          <h2>Others in your home</h2>
          {breakdown.slice(0, 10).map((item) => {
            const other = item as AnomalyOtherPersonItem
            return (
              <div key={item.id}>
                <span>
                  {other.personName} · {other.label}
                </span>
                <strong>{item.anomalyRate}%</strong>
              </div>
            )
          })}
        </section>
      )}
    </>
  )
}

const PatternsOverviewPage = (): React.JSX.Element => {
  const { view, isLoading, hasError, showDelta } = useScopedPatterns()
  const [tab, setTab] = usePatternsTab()
  const history = useHistory()
  const { setSelectedDate } = useSelectedDate()

  const addCheckIn = (dateKey: string) => {
    setSelectedDate(dateKeyToDate(dateKey))
    history.push('/dashboard')
  }

  return (
    <Page
      title="Patterns"
      className="patterns-page"
      backHref="/dashboard"
    >
      {isLoading && <LoadingState />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && view && (
        <>
          <PatternsFilterBar />
          <PatternsTabs
            active={tab}
            onChange={setTab}
          />
          <main className="patterns-tab-panel">
            {view.scoredDays === 0 ? (
              <PatternsEmptyState message="Keep logging daily check-ins and patterns will appear here." />
            ) : tab === 'trend' ? (
              <TrendView
                view={view}
                showDelta={showDelta}
              />
            ) : tab === 'calendar' ? (
              <CalendarContent
                calendar={view.calendar}
                onAddCheckIn={addCheckIn}
              />
            ) : tab === 'household' ? (
              <HouseholdView view={view} />
            ) : (
              <TurningPointsContent view={view} />
            )}
          </main>
        </>
      )}
    </Page>
  )
}

export default PatternsOverviewPage
