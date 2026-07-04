import {
  IonContent,
  IonIcon,
  IonModal,
  IonPage,
  useIonViewWillEnter,
} from '@ionic/react'
import { closeOutline } from 'ionicons/icons'
import { type ReactNode, useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'

import { LoadingState } from '../../components/LoadingState'
import { PersonAvatar } from '../../components/PersonAvatar'
import { RouteModalProvider, useRouteModal } from '../../components/RouteModalContext'
import {
  createHouseholdRecap,
  type HouseholdRecap,
  type HouseholdRecapPerson,
} from '../../lib/householdRecap'
import { useSelectedDate } from '../../context/SelectedDateContext'
import { usePeople } from '../people/usePeople'
import { CheckInWizardPage } from '../checkins/CheckInWizardPage'
import './HouseholdRecapPage.css'

interface RecapSlide {
  title: string
  body: string
  layout: 'center' | 'list'
  content: ReactNode
}

function RecapPersonCard({
  person,
  onRequiredCheckInClick,
}: {
  readonly person: HouseholdRecapPerson
  readonly onRequiredCheckInClick: (personId: string) => void
}) {
  const canOpenCheckIn = Boolean(person.requiresCheckIn)
  const scoreText = person.score === null ? person.label : `${person.score}%`
  const className = `recap-person recap-person--${person.level} ${
    canOpenCheckIn ? 'recap-person--action' : ''
  }`
  const content = (
    <>
      <PersonAvatar
        name={person.displayName}
        src={person.avatarUrl}
        className="recap-person__avatar"
      />
      <span className="recap-person__name">
        {person.displayName}
        {person.requiresCheckIn && (
          <span className="recap-person__required">Check-in required</span>
        )}
      </span>
      <span className="recap-person__score">{scoreText}</span>
    </>
  )

  if (!canOpenCheckIn) {
    return <div className={className}>{content}</div>
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => onRequiredCheckInClick(person.id)}
    >
      {content}
    </button>
  )
}

function RecapPersonList({
  people,
  emptyText,
  onRequiredCheckInClick,
}: {
  readonly people: HouseholdRecapPerson[]
  readonly emptyText: string
  readonly onRequiredCheckInClick: (personId: string) => void
}) {
  if (people.length === 0) {
    return <p className="recap-slide__empty">{emptyText}</p>
  }

  return (
    <div className="recap-person-list">
      {people.map((person) => (
        <RecapPersonCard
          key={person.id}
          person={person}
          onRequiredCheckInClick={onRequiredCheckInClick}
        />
      ))}
    </div>
  )
}

function RecapHero({ person }: { readonly person?: HouseholdRecapPerson }) {
  const featuredName = person?.displayName ?? 'Your household'
  const featuredEmoji = person?.emoji ?? '✨'

  return (
    <div className="recap-hero">
      <div className="recap-hero__portrait">
        {person ? (
          <PersonAvatar
            name={person.displayName}
            src={person.avatarUrl}
            className="recap-hero__avatar"
          />
        ) : (
          <span>{featuredEmoji}</span>
        )}
        <span className="recap-hero__emoji">{featuredEmoji}</span>
      </div>
      <div>
        <p className="recap-hero__label">Most needs attention</p>
        <h3>{featuredName}</h3>
      </div>
    </div>
  )
}

function createRecapSlides(
  recap: HouseholdRecap,
  onRequiredCheckInClick: (personId: string) => void,
): RecapSlide[] {
  const slides: RecapSlide[] = [
    {
      title: recap.title,
      body: recap.summary,
      layout: 'center',
      content: <RecapHero person={recap.featuredPerson} />,
    },
    {
      title: 'Check-ins required',
      body: `These people still need a check-in for ${recap.requiredDateLabel}. Their status uses the latest available data.`,
      layout: 'list',
      content: (
        <RecapPersonList
          people={recap.checkInsRequired}
          emptyText="No check-ins are required right now."
          onRequiredCheckInClick={onRequiredCheckInClick}
        />
      ),
    },
    {
      title: 'Who is doing well',
      body: 'These statuses are based on each person’s latest available data, highest first.',
      layout: 'list',
      content: (
        <RecapPersonList
          people={recap.doingWell}
          emptyText="No one landed in the doing-well range for this recap."
          onRequiredCheckInClick={onRequiredCheckInClick}
        />
      ),
    },
    {
      title: 'Who needs care',
      body: 'These latest statuses point to moderate risk or crisis, lowest first.',
      layout: 'list',
      content: (
        <RecapPersonList
          people={recap.needsCare}
          emptyText="No one landed in the needs-care range for this recap."
          onRequiredCheckInClick={onRequiredCheckInClick}
        />
      ),
    },
  ]

  if (recap.noData.length > 0) {
    slides.push({
      title: 'No status yet',
      body: 'These people do not have enough check-in data to calculate a status.',
      layout: 'list',
      content: (
        <RecapPersonList
          people={recap.noData}
          emptyText="Everyone has at least one scoreable status."
          onRequiredCheckInClick={onRequiredCheckInClick}
        />
      ),
    })
  }

  return slides
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

function RecapCheckInModal({
  personId,
  onDismiss,
}: {
  readonly personId: string | null
  readonly onDismiss: () => void
}) {
  return (
    <IonModal
      isOpen={Boolean(personId)}
      breakpoints={[0, 1]}
      initialBreakpoint={1}
      handle
      className="route-modal"
      onDidDismiss={onDismiss}
    >
      {personId && (
        <RouteModalProvider
          value={{
            isRouteModal: true,
            dismiss: onDismiss,
          }}
        >
          <CheckInWizardPage personIdOverride={personId} />
        </RouteModalProvider>
      )}
    </IonModal>
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
    <div className="recap-page__actions">
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

function HouseholdRecapContent({ recap }: { readonly recap: HouseholdRecap }) {
  const history = useHistory()
  const routeModal = useRouteModal()
  const [slideIndex, setSlideIndex] = useState(0)
  const [checkInPersonId, setCheckInPersonId] = useState<string | null>(null)
  useIonViewWillEnter(() => {
    setSlideIndex(0)
  })

  const slides = createRecapSlides(recap, (personId) => {
    const checkInPath = `/person/${personId}/check-in`
    if (routeModal.isRouteModal) {
      setCheckInPersonId(personId)
      return
    }
    history.push(`${checkInPath}?returnTo=${encodeURIComponent('/household/recap')}`)
  })
  const slide = slides[slideIndex]
  const isFirst = slideIndex === 0
  const isLast = slideIndex === slides.length - 1
  const close = () =>
    routeModal.isRouteModal ? routeModal.dismiss() : history.push('/dashboard')
  const goBack = () => setSlideIndex((current) => Math.max(0, current - 1))
  const goNext = () => {
    if (isLast) {
      close()
      return
    }
    setSlideIndex((current) => Math.min(slides.length - 1, current + 1))
  }

  return (
    <>
      <div className="recap-page">
        <div className="recap-page__topbar">
          <span>{recap.eyebrow}</span>
          <button
            type="button"
            onClick={close}
            aria-label="Close recap"
          >
            <IonIcon icon={closeOutline} />
          </button>
        </div>

        <RecapProgress
          slides={slides}
          slideIndex={slideIndex}
        />

        <section className={`recap-slide recap-slide--${slide.layout}`}>
          <p className="recap-slide__date">{recap.dateLabel}</p>
          <h2>{slide.title}</h2>
          <p>{slide.body}</p>
          {slide.content}
        </section>

        <RecapActions
          isFirst={isFirst}
          isLast={isLast}
          onBack={goBack}
          onNext={goNext}
        />
      </div>

      <RecapCheckInModal
        personId={checkInPersonId}
        onDismiss={() => setCheckInPersonId(null)}
      />
    </>
  )
}

/**
 * Displays the household recap slideshow as a route-level full-screen page.
 * @returns {React.JSX.Element}
 */
export default function HouseholdRecapPage() {
  const people = usePeople()
  const { selectedDate } = useSelectedDate()
  const activePeople = useMemo(
    () => (people.data ?? []).filter((person) => !person.archived),
    [people.data],
  )
  const recap = useMemo(
    () => createHouseholdRecap(activePeople, selectedDate),
    [activePeople, selectedDate],
  )

  return (
    <IonPage>
      <IonContent
        fullscreen
        scrollY={false}
        className="household-recap-content"
      >
        {people.isLoading && <LoadingState />}
        {people.error && <p className="recap-page__fallback">Failed to load recap.</p>}
        {!people.isLoading && !people.error && recap && (
          <HouseholdRecapContent recap={recap} />
        )}
        {!people.isLoading && !people.error && !recap && (
          <p className="recap-page__fallback">No household members to recap yet.</p>
        )}
      </IonContent>
    </IonPage>
  )
}
