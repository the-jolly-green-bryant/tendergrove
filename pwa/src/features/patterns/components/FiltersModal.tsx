import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonChip,
  IonContent,
  IonDatetime,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { closeOutline } from 'ionicons/icons'
import React, { useMemo } from 'react'

import { PersonAvatar } from '../../../components/PersonAvatar'
import { usePatternsData } from '../usePatternsData'
import { usePatternsFilterStore, type AnalyticsType } from '../patternsFilterStore'

import '../patterns.scss'
import { RawPerson } from '../analytics'

const TYPE_OPTIONS: { value: AnalyticsType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'challenges', label: 'Challenges' },
  { value: 'positive', label: 'Positive signs' },
]

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

const DateRangeSection = (): React.JSX.Element => {
  const rangeDays = usePatternsFilterStore((s) => s.rangeDays)
  const customRange = usePatternsFilterStore((s) => s.customRange)
  const setRangeDays = usePatternsFilterStore((s) => s.setRangeDays)
  const setCustomRange = usePatternsFilterStore((s) => s.setCustomRange)
  const mode = customRange ? 'custom' : String(rangeDays)

  const onSegment = (value: string) => {
    if (value === 'custom') {
      const today = new Date()
      const start = new Date(today)
      start.setDate(start.getDate() - 29)
      setCustomRange({ start: iso(start), end: iso(today) })
    } else {
      setRangeDays(Number(value))
    }
  }

  return (
    <section className="patterns-section">
      <h2 className="pattern-calendar-heading">Date range</h2>
      <IonSegment
        value={mode}
        onIonChange={(e) => onSegment(String(e.detail.value ?? '30'))}
      >
        <IonSegmentButton value="30">
          <IonLabel>30 days</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="90">
          <IonLabel>90 days</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="custom">
          <IonLabel>Custom</IonLabel>
        </IonSegmentButton>
      </IonSegment>
      {customRange && (
        <IonList inset>
          <IonItem>
            <IonLabel>Start</IonLabel>
            <IonDatetime
              presentation="date"
              value={customRange.start}
              max={customRange.end}
              onIonChange={(e) =>
                setCustomRange({ ...customRange, start: dayKey(e.detail.value) })
              }
            />
          </IonItem>
          <IonItem>
            <IonLabel>End</IonLabel>
            <IonDatetime
              presentation="date"
              value={customRange.end}
              min={customRange.start}
              onIonChange={(e) =>
                setCustomRange({ ...customRange, end: dayKey(e.detail.value) })
              }
            />
          </IonItem>
        </IonList>
      )}
    </section>
  )
}

const PeopleSection = (): React.JSX.Element => {
  const { data } = usePatternsData()
  const personIds = usePatternsFilterStore((s) => s.personIds)
  const setPersonIds = usePatternsFilterStore((s) => s.setPersonIds)
  const people = useMemo(
    () => ((data ?? []) as RawPerson[]).filter((p) => p.archived !== true),
    [data],
  )

  const toggle = (id: string) => {
    setPersonIds(
      personIds.includes(id) ? personIds.filter((x) => x !== id) : [...personIds, id],
    )
  }

  return (
    <section className="patterns-section">
      <h2 className="pattern-calendar-heading">People</h2>
      <div className="filters-chip-row">
        <IonChip
          outline={personIds.length > 0}
          color={personIds.length === 0 ? 'primary' : undefined}
          onClick={() => setPersonIds([])}
        >
          Everyone
        </IonChip>
        {people.map((person: RawPerson) => {
          const active = personIds.includes(person.id)
          return (
            <IonChip
              key={person.id}
              outline={!active}
              color={active ? 'primary' : undefined}
              onClick={() => toggle(person.id)}
            >
              <PersonAvatar
                name={person.displayName}
                src={person.avatarUrl}
              />
              <IonLabel>{person.displayName}</IonLabel>
            </IonChip>
          )
        })}
      </div>
    </section>
  )
}

const IndicatorsSection = (): React.JSX.Element => {
  const { data } = usePatternsData()
  const indicatorMode = usePatternsFilterStore((s) => s.indicatorMode)
  const indicatorIds = usePatternsFilterStore((s) => s.indicatorIds)
  const setIndicatorMode = usePatternsFilterStore((s) => s.setIndicatorMode)
  const setIndicatorIds = usePatternsFilterStore((s) => s.setIndicatorIds)

  const indicators = useMemo(() => collectIndicators(data?.people ?? []), [data])
  const toggle = (id: string) =>
    setIndicatorIds(
      indicatorIds.includes(id)
        ? indicatorIds.filter((x) => x !== id)
        : [...indicatorIds, id],
    )

  return (
    <section className="patterns-section">
      <h2 className="pattern-calendar-heading">Signals</h2>
      <IonSegment
        value={indicatorMode}
        onIonChange={(e) =>
          setIndicatorMode(e.detail.value === 'custom' ? 'custom' : 'all')
        }
      >
        <IonSegmentButton value="all">
          <IonLabel>All signals</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="custom">
          <IonLabel>Custom</IonLabel>
        </IonSegmentButton>
      </IonSegment>
      {indicatorMode === 'custom' && (
        <>
          <IonNote className="filters-note">{indicatorIds.length} selected</IonNote>
          <IonList inset>
            {indicators.map((indicator) => (
              <IonItem key={indicator.id}>
                <IonCheckbox
                  checked={indicatorIds.includes(indicator.id)}
                  onIonChange={() => toggle(indicator.id)}
                >
                  {indicator.name}
                  <span className="filters-indicator-owner">
                    {' '}
                    · {indicator.personName}
                  </span>
                </IonCheckbox>
              </IonItem>
            ))}
          </IonList>
        </>
      )}
    </section>
  )
}

const TypeSection = (): React.JSX.Element => {
  const type = usePatternsFilterStore((s) => s.type)
  const setType = usePatternsFilterStore((s) => s.setType)
  return (
    <section className="patterns-section">
      <h2 className="pattern-calendar-heading">Type</h2>
      <div className="filters-chip-row">
        {TYPE_OPTIONS.map((option) => (
          <IonChip
            key={option.value}
            outline={type !== option.value}
            color={type === option.value ? 'primary' : undefined}
            onClick={() => setType(option.value)}
          >
            {option.label}
          </IonChip>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const iso = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const dayKey = (value: string | string[] | null | undefined): string => {
  const raw = Array.isArray(value) ? value[0] : value
  return (raw ?? '').slice(0, 10)
}

interface IndicatorOption {
  id: string
  name: string
  personName: string
}

const collectIndicators = (data: RawPerson[]): IndicatorOption[] => {
  const options: IndicatorOption[] = []
  for (const person of (data ?? []).filter((p: RawPerson) => p.archived !== true)) {
    for (const indicator of person.indicators ?? []) {
      if (indicator && indicator.active !== false) {
        options.push({
          id: indicator.id,
          name: indicator.name ?? 'Signal',
          personName: person.displayName,
        })
      }
    }
  }
  return options
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */

export const FiltersModal = ({
  isOpen,
  onDismiss,
}: {
  readonly isOpen: boolean
  readonly onDismiss: () => void
}): React.JSX.Element => {
  const reset = usePatternsFilterStore((s) => s.reset)

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      breakpoints={[0, 1]}
      initialBreakpoint={1}
      handle
      className="filters-modal"
    >
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              aria-label="Close filters"
              onClick={onDismiss}
            >
              <IonIcon
                slot="icon-only"
                icon={closeOutline}
              />
            </IonButton>
          </IonButtons>
          <IonTitle>Filters</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => reset()}>Reset</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <DateRangeSection />
        <PeopleSection />
        <IndicatorsSection />
        <TypeSection />
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonButton
            expand="block"
            onClick={onDismiss}
          >
            Apply filters
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  )
}
