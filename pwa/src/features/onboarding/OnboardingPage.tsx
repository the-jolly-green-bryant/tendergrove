import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react'
import { arrowBack, cameraOutline } from 'ionicons/icons'
import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useAppAuth } from '../../auth/AuthContext'
import { client } from '../../lib/api'
import { writeCachedValue } from '../../lib/resilientCache'
import { trackProductEvent } from '../../lib/productAnalytics'
import type { RawPerson } from '../patterns/analytics'
import { createAvatarDataUrl } from '../people/PersonFormPage'

type Step = 0 | 1 | 2 | 3 | 4 | 5
type PersonKind = 'child' | 'self'

interface StartingSignal {
  key: string
  name: string
  polarity: 'desired' | 'undesired'
  person: PersonKind
}

const DEFAULT_STRENGTHS = [
  'Accepted support or reassurance',
  'Completed part of a daily routine',
  'Connected with someone',
]

const DEFAULT_STRUGGLES = [
  'Sleep was significantly disrupted',
  'Withdrew or isolated',
  'Felt unusually fearful or suspicious',
]

const DEFAULT_SELF_SUPPORT = [
  'Ate and drank enough',
  'Took a short break',
  'Asked someone for help',
]

const STRENGTH_OPTIONS = [
  ...DEFAULT_STRENGTHS,
  'Expressed a need clearly',
  'Enjoyed a familiar activity',
  'Managed a difficult transition',
]

const STRUGGLE_OPTIONS = [
  ...DEFAULT_STRUGGLES,
  'Had trouble communicating clearly',
  'Struggled with eating or hygiene',
  'Became agitated or overwhelmed',
]

const SELF_SUPPORT_OPTIONS = [
  ...DEFAULT_SELF_SUPPORT,
  'Got enough sleep to function',
  'Spent a few minutes outside',
  'Did one thing that felt restorative',
]

const yesterdayAtNoon = (): string => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  date.setHours(12, 0, 0, 0)
  return date.toISOString()
}

const PhotoPicker = ({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string
  onChange: (value: string | undefined) => void
}) => {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const choose = () => input.current?.click()
  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setError('')
      onChange(await createAvatarDataUrl(file))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not use that photo.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="setup-photo">
      <button type="button" onClick={choose} aria-label={`Add a photo for ${label}`}>
        {value ? <img src={value} alt="" /> : <IonIcon icon={cameraOutline} />}
      </button>
      <strong>{label}</strong>
      <span>{value ? 'Change photo' : 'Add photo'}</span>
      <input ref={input} hidden type="file" accept="image/*" onChange={(event) => void handleChange(event)} />
      {error && <small role="alert">{error}</small>}
    </div>
  )
}

const SignalChecklist = ({
  label,
  options,
  selected,
  onOptionsChange,
  onSelectedChange,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onOptionsChange: (options: string[]) => void
  onSelectedChange: (selected: Set<string>) => void
}) => {
  const [custom, setCustom] = useState('')
  const toggle = (name: string) => {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onSelectedChange(next)
  }
  const add = () => {
    const name = custom.trim()
    if (!name) return
    if (!options.some((option) => option.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      onOptionsChange([...options, name])
    }
    onSelectedChange(new Set([...selected, name]))
    setCustom('')
  }

  return (
    <div className="setup-signal-picker">
      <IonList inset aria-label={label}>
        {options.map((option) => (
          <IonItem key={option} lines="full">
            <IonCheckbox checked={selected.has(option)} onIonChange={() => toggle(option)}>{option}</IonCheckbox>
          </IonItem>
        ))}
      </IonList>
      <div className="setup-signal-picker__add">
        <IonInput aria-label={`Add another ${label.toLocaleLowerCase()}`} placeholder="Add your own…" value={custom} onIonInput={(event) => setCustom(event.detail.value ?? '')} />
        <IonButton fill="outline" disabled={!custom.trim()} onClick={add}>Add</IonButton>
      </div>
      <p>{selected.size} selected</p>
    </div>
  )
}

const OnboardingPage = () => {
  const { user } = useAppAuth()
  const router = useIonRouter()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>(0)
  const [selfName, setSelfName] = useState('')
  const [childName, setChildName] = useState('')
  const [strengthOptions, setStrengthOptions] = useState(STRENGTH_OPTIONS)
  const [struggleOptions, setStruggleOptions] = useState(STRUGGLE_OPTIONS)
  const [selfSupportOptions, setSelfSupportOptions] = useState(SELF_SUPPORT_OPTIONS)
  const [strengths, setStrengths] = useState(new Set(DEFAULT_STRENGTHS))
  const [struggles, setStruggles] = useState(new Set(DEFAULT_STRUGGLES))
  const [selfSupport, setSelfSupport] = useState(new Set(DEFAULT_SELF_SUPPORT))
  const [selfPhoto, setSelfPhoto] = useState<string>()
  const [childPhoto, setChildPhoto] = useState<string>()
  const [unsafe, setUnsafe] = useState<boolean | null>(null)
  const [yesterday, setYesterday] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const signals = useMemo<StartingSignal[]>(() => [
    ...[...strengths].map((name) => ({ key: `child-strength-${name}`, name, polarity: 'desired' as const, person: 'child' as const })),
    ...[...struggles].map((name) => ({ key: `child-struggle-${name}`, name, polarity: 'undesired' as const, person: 'child' as const })),
    ...[...selfSupport].map((name) => ({ key: `self-support-${name}`, name, polarity: 'desired' as const, person: 'self' as const })),
    { key: 'self-overwhelmed', name: 'Felt too overwhelmed to recover', polarity: 'undesired', person: 'self' },
  ], [strengths, struggles, selfSupport])

  const toggleYesterday = (key: string) => setYesterday((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const nextDisabled =
    (step === 0 && (!selfName.trim() || !childName.trim())) ||
    (step === 1 && strengths.size === 0) ||
    (step === 2 && struggles.size === 0) ||
    (step === 3 && selfSupport.size === 0) ||
    (step === 4 && unsafe === null)

  const finish = async () => {
    if (!user || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const [selfResult, childResult] = await Promise.all([
        client.models.Person.create({ householdId: user.userId, displayName: selfName.trim(), role: 'self', avatarUrl: selfPhoto }),
        client.models.Person.create({ householdId: user.userId, displayName: childName.trim(), role: 'child', avatarUrl: childPhoto }),
      ])
      const firstPersonError = selfResult.errors?.[0] ?? childResult.errors?.[0]
      if (firstPersonError || !selfResult.data || !childResult.data) throw new Error(firstPersonError?.message ?? 'Could not create your household.')

      const personIds = { self: selfResult.data.id, child: childResult.data.id }
      const createdSignals = await Promise.all(signals.map(async (signal) => {
        const result = await client.models.Indicator.create({
          personId: personIds[signal.person],
          name: signal.name,
          polarity: signal.polarity,
          inputType: 'boolean',
          active: true,
        })
        if (result.errors?.length || !result.data) throw new Error(result.errors?.[0]?.message ?? 'Could not create a starting signal.')
        return { ...signal, id: result.data.id }
      }))

      const occurredAt = yesterdayAtNoon()
      const createdCheckIns = await Promise.all((['self', 'child'] as PersonKind[]).map(async (person) => {
        const result = await client.models.CheckIn.create({
          personId: personIds[person],
          occurredAt,
          answersJson: JSON.stringify({
            checked: createdSignals.filter((signal) => signal.person === person && yesterday.has(signal.key)).map((signal) => signal.id),
            events: [],
          }),
        })
        if (result.errors?.length || !result.data) throw new Error(result.errors?.[0]?.message ?? 'Could not save the first check-in.')
        return { person, data: result.data }
      }))

      const dashboardPeople: RawPerson[] = (['self', 'child'] as PersonKind[]).map((person) => {
        const source = person === 'self' ? selfResult.data! : childResult.data!
        const checkIn = createdCheckIns.find((item) => item.person === person)!.data
        return {
          id: source.id,
          householdId: user.userId,
          displayName: source.displayName,
          role: source.role ?? person,
          avatarUrl: source.avatarUrl ?? null,
          archived: false,
          indicators: createdSignals.filter((signal) => signal.person === person).map((signal) => ({
            id: signal.id,
            name: signal.name,
            polarity: signal.polarity,
            active: true,
          })),
          checkIns: [{
            id: checkIn.id,
            occurredAt: checkIn.occurredAt,
            answersJson: checkIn.answersJson,
            note: checkIn.note ?? undefined,
          }],
          events: [],
        }
      })
      writeCachedValue(`${user.userId}:people`, dashboardPeople)
      queryClient.setQueryData(['people', user.userId], dashboardPeople)
      await queryClient.invalidateQueries({ queryKey: ['patterns-data', user.userId] })
      void trackProductEvent('onboarding_completed', {
        peopleCount: dashboardPeople.length,
        selfTracked: dashboardPeople.some((person) => person.role === 'self'),
      })
      router.push('/dashboard', 'root', 'replace')
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'We could not finish setup. Your answers are still here—try again.')
    } finally {
      setSaving(false)
    }
  }

  const childSignals = signals.filter((signal) => signal.person === 'child')
  const selfSignals = signals.filter((signal) => signal.person === 'self')

  return (
    <IonPage>
      <IonHeader className="setup-header">
        <IonToolbar>
          {step > 0 && <IonButton slot="start" fill="clear" aria-label="Go back" onClick={() => setStep((step - 1) as Step)}><IonIcon icon={arrowBack} /></IonButton>}
          <IonTitle>Set up your household</IonTitle>
        </IonToolbar>
        <IonProgressBar value={(step + 1) / 6} />
      </IonHeader>
      <IonContent fullscreen className="setup-wizard">
        <main className="setup-wizard__card">
          <p className="setup-wizard__step">Step {step + 1} of 6</p>

          {step === 0 && <>
            <h1>Let’s start with the two of you.</h1>
            <p>You’ll both get a few useful things to notice. Nothing has to be perfect, and everything can be changed later.</p>
            <IonList inset>
              <IonItem><IonInput label="What should we call you?" labelPlacement="stacked" placeholder="Your first name" value={selfName} onIonInput={(event) => setSelfName(event.detail.value ?? '')} /></IonItem>
              <IonItem><IonInput label="What should we call your child?" labelPlacement="stacked" placeholder="First name or nickname" value={childName} onIonInput={(event) => setChildName(event.detail.value ?? '')} /></IonItem>
            </IonList>
          </>}

          {step === 1 && <>
            <h1>What does {childName || 'your child'} succeed at?</h1>
            <p>Keep the small wins. They help show what is working—not only what is hard.</p>
            <SignalChecklist label="Starting strengths" options={strengthOptions} selected={strengths} onOptionsChange={setStrengthOptions} onSelectedChange={setStrengths} />
          </>}

          {step === 2 && <>
            <h1>What does {childName || 'your child'} struggle with?</h1>
            <p>Choose observable changes rather than trying to name the cause. These are notes, not a diagnosis.</p>
            <SignalChecklist label="Things to notice" options={struggleOptions} selected={struggles} onOptionsChange={setStruggleOptions} onSelectedChange={setStruggles} />
          </>}

          {step === 3 && <>
            <h1>What helps you keep going?</h1>
            <p>Your wellbeing belongs in the picture too. Add a few realistic ways you can support yourself.</p>
            <SignalChecklist label="Daily support for me" options={selfSupportOptions} selected={selfSupport} onOptionsChange={setSelfSupportOptions} onSelectedChange={setSelfSupport} />
          </>}

          {step === 4 && <>
            <h1>Make it feel like your household.</h1>
            <p>Photos are optional. You can always add or change them later.</p>
            <div className="setup-photos">
              <PhotoPicker label={selfName || 'You'} value={selfPhoto} onChange={setSelfPhoto} />
              <PhotoPicker label={childName || 'Your child'} value={childPhoto} onChange={setChildPhoto} />
            </div>
            <section className="setup-safety" aria-labelledby="setup-safety-title">
              <h2 id="setup-safety-title">Is anyone currently unsafe?</h2>
              <p>This does not affect a score. It helps us point you toward human support.</p>
              <div className="setup-safety-segment" data-value={unsafe === null ? 'unset' : String(unsafe)} role="radiogroup" aria-label="Is anyone currently unsafe?">
                <button type="button" role="radio" aria-checked={unsafe === false} onClick={() => setUnsafe(false)}>No immediate danger</button>
                <button type="button" role="radio" aria-checked={unsafe === true} onClick={() => setUnsafe(true)}>Yes or not sure</button>
              </div>
              {unsafe === true && <div className="safety-escalation"><strong>Do not wait on Grove.</strong><p>If someone may be in immediate danger, contact emergency services or trained crisis support now.</p><IonButton color="danger" routerLink="/help-now">View support options</IonButton></div>}
            </section>
          </>}

          {step === 5 && <>
            <h1>How did yesterday go?</h1>
            <p>Check only what happened. Leaving something unchecked does not mean you forgot it.</p>
            <div className="setup-checkin-group"><h2>{childName}</h2>{childSignals.map((signal) => <IonItem key={signal.key} lines="none"><IonCheckbox checked={yesterday.has(signal.key)} onIonChange={() => toggleYesterday(signal.key)}>{signal.name}</IonCheckbox></IonItem>)}</div>
            <div className="setup-checkin-group"><h2>{selfName}</h2>{selfSignals.map((signal) => <IonItem key={signal.key} lines="none"><IonCheckbox checked={yesterday.has(signal.key)} onIonChange={() => toggleYesterday(signal.key)}>{signal.name}</IonCheckbox></IonItem>)}</div>
            <p className="legal-note">Grove records observations. It does not diagnose, predict an emergency, or determine whether hospital care is needed.</p>
          </>}

          {saveError && <p className="setup-wizard__error" role="alert">{saveError}</p>}
          <IonButton className="setup-wizard__continue" expand="block" disabled={nextDisabled || saving} onClick={() => step === 5 ? void finish() : setStep((step + 1) as Step)}>{saving ? 'Building your dashboard…' : step === 5 ? 'Finish and see my dashboard' : 'Continue'}</IonButton>
          {step === 4 && <IonButton expand="block" fill="clear" disabled={unsafe === null} onClick={() => setStep(5)}>Skip photos</IonButton>}
        </main>
      </IonContent>
    </IonPage>
  )
}

export default OnboardingPage
