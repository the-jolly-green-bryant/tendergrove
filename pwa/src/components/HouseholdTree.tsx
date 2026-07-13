import React, { useMemo } from 'react'
import './HouseholdTree.css'

import { PersonAvatar } from './PersonAvatar'
import type { HouseholdRecap } from '../lib/householdRecap'

interface Person {
  id: string
  displayName: string
  avatarUrl?: string | null
  energy: number // 0-100
  isSelf?: boolean
}

interface HouseholdTreeProps {
  people: Person[]
  className?: string
  showGreeting?: boolean
  showSingleGreeting?: boolean
  recap?: HouseholdRecap
  isTimeTravel?: boolean
  selectedDateHasData?: boolean
  onPersonClick?: (personId: string) => void
  onRecapClick?: () => void
}

interface Point {
  x: number
  y: number
}

interface SliceAngles {
  mid: number
  start: number
  end: number
}

const getTreeStage = (score: number): number => {
  if (score <= 20) return 1
  if (score <= 40) return 2
  if (score <= 60) return 3
  if (score <= 80) return 4
  return 5
}

const getStatusColor = (score: number): string => {
  if (score >= 80) return '#2FAE60'
  if (score >= 60) return '#F5A623'
  return '#E8453C'
}

const clampScore = (score: number): number =>
  Math.min(100, Math.max(0, Math.round(score)))

const polarPoint = (angle: number, radius: number): Point => {
  const radians = (angle * Math.PI) / 180
  return {
    x: 50 + radius * Math.cos(radians),
    y: 50 + radius * Math.sin(radians),
  }
}

const getSliceAngles = (index: number, sliceSize: number): SliceAngles => {
  const mid = -90 + sliceSize * index
  return {
    mid,
    start: mid - sliceSize / 2,
    end: mid + sliceSize / 2,
  }
}

const slicePath = ({ start, end }: SliceAngles): string => {
  const startPoint = polarPoint(start, 45)
  const endPoint = polarPoint(end, 45)
  const largeArc = end - start > 180 ? 1 : 0

  return `M 50 50 L ${startPoint.x} ${startPoint.y} A 45 45 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y} Z`
}

const singlePersonInsight = (score: number): string => {
  if (score > 80) return 'You are radiating positive energy and staying resilient.'
  if (score > 60)
    return 'You are finding a healthy rhythm and maintaining good resilience.'
  if (score > 40) return 'Consistency is improving as you navigate the week.'
  if (score > 20)
    return 'Consistency is improving. Keep focusing on your daily check-ins.'

  return 'Take some time for self-care. A little extra attention to your wellbeing goes a long way today.'
}

const householdInsight = (score: number, strugglingPerson?: Person): string => {
  if (score > 80)
    return 'Everyone is doing well. Your household is radiating positive energy.'
  if (score > 60 && strugglingPerson) {
    return `${strugglingPerson.displayName} could use a little extra support today, but overall resilience remains good.`
  }
  if (score > 60) return 'Your household is finding a healthy rhythm together.'
  if (score > 40 && strugglingPerson) {
    return `${strugglingPerson.displayName} has had a difficult week, but consistency is improving.`
  }
  if (score > 40) return 'Maintaining a stable foundation as you navigate the week.'
  if (score > 20) {
    return 'Your household is showing resilience. Consistency is improving as you reconnect.'
  }

  return 'Take some time to reconnect. A little extra attention to each other goes a long way today.'
}

const getHouseholdStatus = (score: number): string => {
  if (score > 80) return 'Thriving'
  if (score > 60) return 'Growing steadily'
  if (score > 40) return 'Holding steady'
  if (score > 20) return 'Recovering'
  return 'Needs care'
}

const getHouseholdNarrative = (
  score: number,
  people: Person[],
): { status: string; insight: string } => {
  const strugglingPerson = people.find((p) => p.energy <= 40)
  const insight =
    people.length === 1
      ? singlePersonInsight(score)
      : householdInsight(score, strugglingPerson)

  return {
    status: getHouseholdStatus(score),
    insight,
  }
}

const SliceClip = ({
  index,
  isSinglePerson,
  sliceSize,
}: {
  readonly index: number
  readonly isSinglePerson: boolean
  readonly sliceSize: number
}) => {
  const angles = getSliceAngles(index, sliceSize)

  return (
    <clipPath id={`tree-slice-${index}`}>
      {isSinglePerson ? (
        <circle
          cx="50"
          cy="50"
          r="45"
        />
      ) : (
        <path d={slicePath(angles)} />
      )}
    </clipPath>
  )
}

const TreeSlice = ({
  person,
  index,
}: {
  readonly person: Person
  readonly index: number
}) => {
  const score = clampScore(person.energy)
  const stage = getTreeStage(score)
  const imageSize = 92
  const imageOffset = (100 - imageSize) / 2

  return (
    <g
      className="tree-pie__slice"
      filter="url(#tree-pie-shadow)"
    >
      <image
        href={`/assets/tree/tree_stage_${stage}.png`}
        x={imageOffset}
        y={imageOffset}
        width={imageSize}
        height={imageSize}
        preserveAspectRatio="xMidYMid meet"
        clipPath={`url(#tree-slice-${index})`}
      >
        <title>
          {person.displayName}: {score}% wellbeing, tree stage {stage}
        </title>
      </image>
    </g>
  )
}

const TreePie = ({
  people,
  isSinglePerson,
  sliceSize,
}: {
  readonly people: Person[]
  readonly isSinglePerson: boolean
  readonly sliceSize: number
}) => {
  const ariaLabel = isSinglePerson
    ? `${people[0].displayName}'s wellbeing tree`
    : 'Household wellbeing trees by person'

  return (
    <svg
      className="tree-pie tree-stage__tree"
      viewBox="0 0 100 100"
      role="img"
      aria-label={ariaLabel}
    >
      <TreePieDefs
        people={people}
        isSinglePerson={isSinglePerson}
        sliceSize={sliceSize}
      />

      <circle
        className="tree-pie__backing"
        cx="50"
        cy="50"
        r="45"
      />

      {people.map((person, index) => (
        <TreeSlice
          key={person.id}
          person={person}
          index={index}
        />
      ))}

      <TreePieDividers
        people={people}
        isSinglePerson={isSinglePerson}
        sliceSize={sliceSize}
      />
    </svg>
  )
}

function TreePieDefs({
  people,
  isSinglePerson,
  sliceSize,
}: {
  readonly people: Person[]
  readonly isSinglePerson: boolean
  readonly sliceSize: number
}) {
  return (
    <defs>
      <filter
        id="tree-pie-shadow"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
      >
        <feDropShadow
          dx="0"
          dy="2"
          stdDeviation="2"
          floodColor="#2F3A2E"
          floodOpacity="0.15"
        />
      </filter>
      {people.map((person, index) => (
        <SliceClip
          key={person.id}
          index={index}
          isSinglePerson={isSinglePerson}
          sliceSize={sliceSize}
        />
      ))}
    </defs>
  )
}

function TreePieDividers({
  people,
  isSinglePerson,
  sliceSize,
}: {
  readonly people: Person[]
  readonly isSinglePerson: boolean
  readonly sliceSize: number
}) {
  if (isSinglePerson) return null

  return people.map((person, index) => {
    const edge = polarPoint(getSliceAngles(index, sliceSize).mid, 45)
    return (
      <line
        key={`${person.id}-divider`}
        className="tree-pie__divider"
        x1="50"
        y1="50"
        x2={edge.x}
        y2={edge.y}
      />
    )
  })
}

const EmptyTree = ({ stage }: { readonly stage: number }) => {
  return (
    <div className="tree-image-wrapper">
      <img
        src={`/assets/tree/tree_stage_${stage}.png`}
        alt="Household wellbeing tree"
        className="tree-image tree-stage__tree active"
      />
    </div>
  )
}

const SinglePersonTree = ({ stage }: { readonly stage: number }) => {
  return (
    <div className="single-person-tree">
      <img
        src={`/assets/tree/tree_stage_${stage}.png`}
        alt="Wellbeing tree"
        className="single-person-tree__image tree-stage__tree"
      />
    </div>
  )
}

const AvatarMarker = ({
  person,
  index,
  isSinglePerson,
  sliceSize,
  onPersonClick,
}: {
  readonly person: Person
  readonly index: number
  readonly isSinglePerson: boolean
  readonly sliceSize: number
  readonly onPersonClick?: (personId: string) => void
}) => {
  const score = clampScore(person.energy)
  const position = polarPoint(
    getSliceAngles(index, sliceSize).mid,
    isSinglePerson ? 0 : 45,
  )
  const clickable = Boolean(onPersonClick)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!clickable) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onPersonClick!(person.id)
  }

  return (
    <div
      className={`avatar-container ${clickable ? 'is-clickable' : ''}`}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `View ${person.displayName}` : undefined}
      onClick={clickable ? () => onPersonClick!(person.id) : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
    >
      <div
        className="avatar-ring"
        style={{ borderColor: getStatusColor(score) }}
      >
        <PersonAvatar
          name={person.displayName}
          src={person.avatarUrl}
          className="avatar-img"
        />
        <div
          className="avatar-score-badge"
          style={{ backgroundColor: getStatusColor(score) }}
          aria-label={`${person.displayName} wellbeing ${score}%`}
        />
      </div>
    </div>
  )
}

const TreeArtwork = ({
  people,
  stage,
  isSinglePerson,
  sliceSize,
}: {
  readonly people: Person[]
  readonly stage: number
  readonly isSinglePerson: boolean
  readonly sliceSize: number
}) => {
  if (isSinglePerson) {
    return <SinglePersonTree stage={stage} />
  }
  if (people.length === 0) {
    return <EmptyTree stage={stage} />
  }

  return (
    <TreePie
      people={people}
      isSinglePerson={isSinglePerson}
      sliceSize={sliceSize}
    />
  )
}

const TreeVisual = ({
  people,
  stage,
  isSinglePerson,
  isTimeTravel,
  onPersonClick,
}: {
  readonly people: Person[]
  readonly stage: number
  readonly isSinglePerson: boolean
  readonly isTimeTravel: boolean
  readonly onPersonClick?: (personId: string) => void
}) => {
  const sliceSize = people.length > 0 ? 360 / people.length : 360

  return (
    <div
      className={`tree-visualization tree-stage${isTimeTravel ? ' tree-stage--time-travel' : ''
        }`}
    >
      <TreeArtwork
        people={people}
        stage={stage}
        isSinglePerson={isSinglePerson}
        sliceSize={sliceSize}
      />

      {isTimeTravel && (
        <img
          className="tree-stage__time-overlay"
          src="/assets/time-travel-overlay.png"
          alt=""
          aria-hidden="true"
        />
      )}

      {!isSinglePerson && (
        <div className="avatars-overlay">
          {people.map((person, index) => (
            <AvatarMarker
              key={person.id}
              person={person}
              index={index}
              isSinglePerson={isSinglePerson}
              sliceSize={sliceSize}
              onPersonClick={onPersonClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const HouseholdRecapTeaser = ({
  recap,
  isTimeTravel,
  emptyPastDate,
  onRecapClick,
}: {
  readonly recap: HouseholdRecap
  readonly isTimeTravel: boolean
  readonly emptyPastDate: boolean
  readonly onRecapClick?: () => void
}) => {
  const featured = recap.featuredPerson
  const eyebrow = (() => {
    if (!isTimeTravel) return recap.eyebrow
    if (emptyPastDate) return 'Tap to complete check-ins'
    return 'Tap for recap'
  })()
  const title = emptyPastDate ? 'Fill in missing check-ins' : recap.title

  return (
    <button
      type="button"
      className="household-recap-teaser"
      onClick={onRecapClick}
    >
      <div className="household-recap-teaser__art">
        {featured ? (
          <PersonAvatar
            name={featured.displayName}
            src={featured.avatarUrl}
            className="household-recap-teaser__avatar"
          />
        ) : (
          <span>✨</span>
        )}
        <span className="household-recap-teaser__emoji">{featured?.emoji ?? '✨'}</span>
      </div>
      <span className="household-recap-teaser__copy">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
      </span>
      <span className="household-recap-teaser__chevron">›</span>
    </button>
  )
}

const HouseholdSummary = ({
  people,
  score,
  narrative,
}: {
  readonly people: Person[]
  readonly score: number
  readonly narrative: { status: string; insight: string }
}) => {
  return (
    <div className="household-summary">
      <div className="household-wellbeing-label">
        {people.length === 1 ? 'Your Wellbeing' : 'Household Wellbeing'}
      </div>
      <div className="household-score-value">{score}</div>
      <div className="household-narrative">
        <div className="status">{narrative.status}</div>
        <div className="insight">{narrative.insight}</div>
      </div>
    </div>
  )
}

export const HouseholdTree: React.FC<HouseholdTreeProps> = ({
  people,
  className = '',
  recap,
  isTimeTravel = false,
  selectedDateHasData = true,
  onPersonClick,
  onRecapClick,
}) => {
  const householdScore = useMemo(() => {
    if (people.length === 0) return 0
    const total = people.reduce((acc, p) => acc + p.energy, 0)
    return clampScore(total / people.length)
  }, [people])

  const stage = getTreeStage(householdScore)
  const narrative = getHouseholdNarrative(householdScore, people)
  const isSinglePerson = people.length === 1

  return (
    <div className={`household-tree-container ${className}`}>
      <div className={`household-tree-card ${isSinglePerson ? 'is-single' : ''}`}>
        <div className="tree-composition">
          <TreeVisual
            people={people}
            stage={stage}
            isSinglePerson={isSinglePerson}
            isTimeTravel={isTimeTravel}
            onPersonClick={onPersonClick}
          />
        </div>

        <div className="section-divider"></div>

        {recap ? (
          <HouseholdRecapTeaser
            recap={recap}
            isTimeTravel={isTimeTravel}
            emptyPastDate={isTimeTravel && !selectedDateHasData}
            onRecapClick={onRecapClick}
          />
        ) : (
          <HouseholdSummary
            people={people}
            score={householdScore}
            narrative={narrative}
          />
        )}
      </div>
    </div>
  )
}
