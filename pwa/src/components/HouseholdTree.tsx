import React, { useMemo, useState } from 'react'
import './HouseholdTree.css'

import { PersonAvatar } from './PersonAvatar'
import { Greeting } from './Greeting'

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
  onPersonClick?: (personId: string) => void
}

/** A single person's status inside the household recap. */
export interface HouseholdRecapPerson {
  id: string
  displayName: string
  avatarUrl?: string | null
  score: number | null
  label: string
  level: 'good' | 'trouble' | 'at-risk' | 'unknown'
  emoji: string
}

/** Data used to render the compact household recap and its slideshow. */
export interface HouseholdRecap {
  eyebrow: string
  title: string
  dateLabel: string
  summary: string
  featuredPerson?: HouseholdRecapPerson
  doingWell: HouseholdRecapPerson[]
  needsCare: HouseholdRecapPerson[]
  noData: HouseholdRecapPerson[]
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

function SliceClip({
  index,
  isSinglePerson,
  sliceSize,
}: {
  readonly index: number
  readonly isSinglePerson: boolean
  readonly sliceSize: number
}) {
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

function TreeSlice({
  person,
  index,
}: {
  readonly person: Person
  readonly index: number
}) {
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

function TreePie({
  people,
  isSinglePerson,
  sliceSize,
}: {
  readonly people: Person[]
  readonly isSinglePerson: boolean
  readonly sliceSize: number
}) {
  const ariaLabel = isSinglePerson
    ? `${people[0].displayName}'s wellbeing tree`
    : 'Household wellbeing trees by person'

  return (
    <svg
      className="tree-pie"
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

function EmptyTree({ stage }: { readonly stage: number }) {
  return (
    <div className="tree-image-wrapper">
      <img
        src={`/assets/tree/tree_stage_${stage}.png`}
        alt="Household wellbeing tree"
        className="tree-image active"
      />
    </div>
  )
}

function SinglePersonTree({ stage }: { readonly stage: number }) {
  return (
    <div className="single-person-tree">
      <img
        src={`/assets/tree/tree_stage_${stage}.png`}
        alt="Wellbeing tree"
        className="single-person-tree__image"
      />
    </div>
  )
}

function AvatarMarker({
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
}) {
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
        >
          {score}
          {isSinglePerson && '%'}
        </div>
      </div>
    </div>
  )
}

function TreeArtwork({
  people,
  stage,
  isSinglePerson,
  sliceSize,
}: {
  readonly people: Person[]
  readonly stage: number
  readonly isSinglePerson: boolean
  readonly sliceSize: number
}) {
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

function TreeVisual({
  people,
  stage,
  isSinglePerson,
  onPersonClick,
}: {
  readonly people: Person[]
  readonly stage: number
  readonly isSinglePerson: boolean
  readonly onPersonClick?: (personId: string) => void
}) {
  const sliceSize = people.length > 0 ? 360 / people.length : 360

  return (
    <div className="tree-visualization">
      <TreeArtwork
        people={people}
        stage={stage}
        isSinglePerson={isSinglePerson}
        sliceSize={sliceSize}
      />

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

function HouseholdTreeGreeting({
  showGreeting,
  showSingleGreeting,
  isSinglePerson,
  selfPerson,
}: {
  readonly showGreeting: boolean
  readonly showSingleGreeting: boolean
  readonly isSinglePerson: boolean
  readonly selfPerson?: Person
}) {
  if (showGreeting) {
    return (
      <div className="household-tree-greeting">
        <Greeting />
      </div>
    )
  }
  if (!showSingleGreeting || !isSinglePerson || !selfPerson) return null

  return (
    <div className="household-tree-greeting">
      <h1 className="household-greeting">Hi, {selfPerson.displayName}</h1>
      <p className="household-subtitle">Here's a look at your wellbeing.</p>
    </div>
  )
}

function RecapPersonList({
  people,
  emptyText,
}: {
  readonly people: HouseholdRecapPerson[]
  readonly emptyText: string
}) {
  if (people.length === 0) {
    return <p className="recap-slide__empty">{emptyText}</p>
  }

  return (
    <div className="recap-person-list">
      {people.map((person) => (
        <div
          key={person.id}
          className={`recap-person recap-person--${person.level}`}
        >
          <span className="recap-person__emoji">{person.emoji}</span>
          <span className="recap-person__name">{person.displayName}</span>
          <span className="recap-person__score">
            {person.score === null ? person.label : `${person.score}%`}
          </span>
        </div>
      ))}
    </div>
  )
}

interface RecapSlide {
  title: string
  body: string
  content: React.ReactNode
}

function createRecapSlides(recap: HouseholdRecap): RecapSlide[] {
  const featuredName = recap.featuredPerson?.displayName ?? 'Your household'
  const featuredEmoji = recap.featuredPerson?.emoji ?? '✨'

  return [
    {
      title: recap.title,
      body: recap.summary,
      content: (
        <div className="recap-hero">
          <div className="recap-hero__emoji">{featuredEmoji}</div>
          <div>
            <p className="recap-hero__label">Most needs attention</p>
            <h3>{featuredName}</h3>
          </div>
        </div>
      ),
    },
    {
      title: 'Who is doing well',
      body: 'These check-ins landed in a healthier range.',
      content: (
        <RecapPersonList
          people={recap.doingWell}
          emptyText="No one landed in the doing-well range for this recap."
        />
      ),
    },
    {
      title: 'Who needs care',
      body: 'These check-ins point to moderate risk or crisis.',
      content: (
        <RecapPersonList
          people={recap.needsCare}
          emptyText="No one landed in the needs-care range for this recap."
        />
      ),
    },
    {
      title: 'Missing check-ins',
      body: `For ${recap.dateLabel}, these people did not have scoreable data.`,
      content: (
        <RecapPersonList
          people={recap.noData}
          emptyText="Everyone had scoreable data for this recap."
        />
      ),
    },
  ]
}

function RecapModalTopbar({
  eyebrow,
  onClose,
}: {
  readonly eyebrow: string
  readonly onClose: () => void
}) {
  return (
    <div className="recap-modal__topbar">
      <span>{eyebrow}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close recap"
      >
        Close
      </button>
    </div>
  )
}

function RecapProgress({
  slides,
  slideIndex,
}: {
  readonly slides: RecapSlide[]
  readonly slideIndex: number
}) {
  return (
    <div className="recap-progress">
      {slides.map((item, index) => (
        <span
          key={item.title}
          className={index <= slideIndex ? 'is-active' : ''}
        />
      ))}
    </div>
  )
}

function RecapSlideView({
  slide,
  dateLabel,
}: {
  readonly slide: RecapSlide
  readonly dateLabel: string
}) {
  return (
    <section className="recap-slide">
      <p className="recap-slide__date">{dateLabel}</p>
      <h2>{slide.title}</h2>
      <p>{slide.body}</p>
      {slide.content}
    </section>
  )
}

function RecapActions({
  isFirst,
  isLast,
  onBack,
  onNext,
}: {
  readonly isFirst: boolean
  readonly isLast: boolean
  readonly onBack: () => void
  readonly onNext: () => void
}) {
  return (
    <div className="recap-modal__actions">
      <button
        type="button"
        onClick={onBack}
        disabled={isFirst}
      >
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
      >
        {isLast ? 'Done' : 'Next'}
      </button>
    </div>
  )
}

function HouseholdRecapModal({
  recap,
  onClose,
}: {
  readonly recap: HouseholdRecap
  readonly onClose: () => void
}) {
  const [slideIndex, setSlideIndex] = useState(0)
  const slides = createRecapSlides(recap)
  const slide = slides[slideIndex]
  const isFirst = slideIndex === 0
  const isLast = slideIndex === slides.length - 1
  const goBack = () => setSlideIndex((current) => Math.max(0, current - 1))
  const goNext = isLast ? onClose : () => setSlideIndex((current) => current + 1)

  return (
    <div
      className="recap-modal"
      role="dialog"
      aria-modal="true"
      aria-label={recap.title}
    >
      <div className="recap-modal__panel">
        <RecapModalTopbar
          eyebrow={recap.eyebrow}
          onClose={onClose}
        />
        <RecapProgress
          slides={slides}
          slideIndex={slideIndex}
        />
        <RecapSlideView
          slide={slide}
          dateLabel={recap.dateLabel}
        />
        <RecapActions
          isFirst={isFirst}
          isLast={isLast}
          onBack={goBack}
          onNext={goNext}
        />
      </div>
    </div>
  )
}

function HouseholdRecapTeaser({ recap }: { readonly recap: HouseholdRecap }) {
  const [isOpen, setIsOpen] = useState(false)
  const featured = recap.featuredPerson

  return (
    <>
      <button
        type="button"
        className="household-recap-teaser"
        onClick={() => setIsOpen(true)}
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
          <span className="household-recap-teaser__emoji">
            {featured?.emoji ?? '✨'}
          </span>
        </div>
        <span className="household-recap-teaser__copy">
          <span>{recap.eyebrow}</span>
          <strong>{recap.title}</strong>
        </span>
        <span className="household-recap-teaser__chevron">›</span>
      </button>

      {isOpen && (
        <HouseholdRecapModal
          recap={recap}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

function HouseholdSummary({
  people,
  score,
  narrative,
}: {
  readonly people: Person[]
  readonly score: number
  readonly narrative: { status: string; insight: string }
}) {
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
  showGreeting = false,
  showSingleGreeting = true,
  recap,
  onPersonClick,
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
        <HouseholdTreeGreeting
          showGreeting={showGreeting}
          showSingleGreeting={showSingleGreeting}
          isSinglePerson={isSinglePerson}
          selfPerson={people.find((p) => p.isSelf)}
        />

        <div className="tree-composition">
          <TreeVisual
            people={people}
            stage={stage}
            isSinglePerson={isSinglePerson}
            onPersonClick={onPersonClick}
          />
        </div>

        <div className="section-divider"></div>

        {recap ? (
          <HouseholdRecapTeaser recap={recap} />
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
