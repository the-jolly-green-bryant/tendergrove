import {
  IonButton,
  IonCheckbox,
  IonChip,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { client } from '../../lib/api'
import { useAppAuth } from '../../auth/AuthContext'

type ChangeKey = 'sleep' | 'fear' | 'perception' | 'communication' | 'agitation' | 'withdrawal' | 'safety' | 'selfcare'

const CHANGE_OPTIONS: Array<{ key: ChangeKey; label: string }> = [
  { key: 'sleep', label: 'Sleep changed' },
  { key: 'fear', label: 'Unusually fearful or suspicious' },
  { key: 'perception', label: 'Responding to things others do not notice' },
  { key: 'communication', label: 'Harder to follow or communicate' },
  { key: 'agitation', label: 'Agitation, threats, or aggression' },
  { key: 'withdrawal', label: 'Withdrawing or isolating' },
  { key: 'safety', label: 'Statements or actions about harm or safety' },
  { key: 'selfcare', label: 'Eating, hygiene, or daily care changed' },
]

const SIGNALS: Record<ChangeKey, { name: string; polarity: 'desired' | 'undesired' }> = {
  sleep: { name: 'Major sleep disruption', polarity: 'undesired' },
  fear: { name: 'Unusual fear or suspiciousness', polarity: 'undesired' },
  perception: { name: 'Responding to unusual sights, sounds, or beliefs', polarity: 'undesired' },
  communication: { name: 'Disorganized or hard-to-follow communication', polarity: 'undesired' },
  agitation: { name: 'Agitation, threats, or aggression', polarity: 'undesired' },
  withdrawal: { name: 'Withdrawal or isolation', polarity: 'undesired' },
  safety: { name: 'Statements or actions about harm or safety', polarity: 'undesired' },
  selfcare: { name: 'Eating, hygiene, or self-care difficulty', polarity: 'undesired' },
}

const POSITIVE_SIGNALS = [
  'Slept for a meaningful stretch',
  'Ate and drank enough',
  'Accepted support or reassurance',
]

const CAREGIVER_SIGNALS = [
  { name: 'Caregiver burnout felt unmanageable', polarity: 'undesired' as const },
  { name: 'Caregiver missed sleep or meals', polarity: 'undesired' as const },
  { name: 'Caregiver accepted help or took a break', polarity: 'desired' as const },
]

const OnboardingPage = () => {
  const { user } = useAppAuth()
  const router = useIonRouter()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [changes, setChanges] = useState<Set<ChangeKey>>(new Set())
  const [began, setBegan] = useState('')
  const [remember, setRemember] = useState('')
  const [unsafe, setUnsafe] = useState<boolean | null>(null)
  const [addSelf, setAddSelf] = useState(true)
  const [saving, setSaving] = useState(false)

  const suggested = useMemo(() => {
    const selected = [...changes].map((key) => SIGNALS[key])
    const defaults = changes.size === 0 ? [SIGNALS.sleep, SIGNALS.agitation, SIGNALS.withdrawal] : []
    return [...selected, ...defaults, ...POSITIVE_SIGNALS.map((signal) => ({ name: signal, polarity: 'desired' as const }))].slice(0, 8)
  }, [changes])

  const toggleChange = (key: ChangeKey) => setChanges((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const finish = async () => {
    if (!user || !name.trim() || unsafe === null) return
    setSaving(true)
    try {
      const personResult = await client.models.Person.create({
        householdId: user.userId,
        displayName: name.trim(),
        role: 'child',
      })
      if (personResult.errors?.length || !personResult.data) throw new Error(personResult.errors?.[0]?.message ?? 'Could not create person')
      const reason = [
        changes.size ? `Changes noticed: ${[...changes].map((key) => CHANGE_OPTIONS.find((option) => option.key === key)?.label).filter(Boolean).join(', ')}.` : '',
        began ? `Changes began: ${began}.` : '',
        remember ? `Parent wants help remembering: ${remember}.` : '',
      ].filter(Boolean).join(' ')
      await Promise.all(suggested.map((signal) => client.models.Indicator.create({
        personId: personResult.data!.id,
        name: signal.name,
        description: reason || undefined,
        polarity: signal.polarity,
        inputType: 'boolean',
        active: true,
      })))
      if (addSelf) {
        const selfResult = await client.models.Person.create({ householdId: user.userId, displayName: 'Me', role: 'self' })
        if (selfResult.data) await Promise.all(CAREGIVER_SIGNALS.map((signal) => client.models.Indicator.create({
          personId: selfResult.data!.id,
          name: signal.name,
          polarity: signal.polarity,
          inputType: 'boolean',
          active: true,
        })))
      }
      await queryClient.invalidateQueries({ queryKey: ['people'] })
      router.push(`/person/${personResult.data.id}/check-in`, 'forward')
    } finally {
      setSaving(false)
    }
  }

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Start with what’s happening</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding caregiver-onboarding">
        <p className="onboarding-lede">You do not need a diagnosis or a perfect history. Start with what you are seeing today.</p>
        <IonList inset>
          <IonItem><IonInput label="Who are you concerned about?" labelPlacement="stacked" placeholder="First name or nickname" value={name} onIonInput={(e) => setName(e.detail.value ?? '')} /></IonItem>
        </IonList>

        <h2>What changes have you noticed?</h2>
        <p>Select what stands out. We will start with no more than eight useful signals.</p>
        <div className="onboarding-chips">
          {CHANGE_OPTIONS.map((option) => <IonChip key={option.key} color={changes.has(option.key) ? 'primary' : undefined} onClick={() => toggleChange(option.key)}>{option.label}</IonChip>)}
        </div>

        <IonList inset>
          <IonItem><IonInput label="When did this begin?" labelPlacement="stacked" placeholder="About two weeks ago, after school started…" value={began} onIonInput={(e) => setBegan(e.detail.value ?? '')} /></IonItem>
          <IonItem><IonTextarea label="What would you like help remembering?" labelPlacement="stacked" placeholder="What happened before episodes, sleep, medication changes, what helped…" value={remember} onIonInput={(e) => setRemember(e.detail.value ?? '')} /></IonItem>
        </IonList>

        <section className="onboarding-safety" role="group" aria-labelledby="safety-question">
          <h2 id="safety-question">Is anyone currently unsafe?</h2>
          <IonButton color={unsafe === true ? 'danger' : 'medium'} fill={unsafe === true ? 'solid' : 'outline'} onClick={() => setUnsafe(true)}>Yes or I’m not sure</IonButton>
          <IonButton color={unsafe === false ? 'primary' : 'medium'} fill={unsafe === false ? 'solid' : 'outline'} onClick={() => setUnsafe(false)}>No immediate danger</IonButton>
          {unsafe === true && <div className="safety-escalation"><p>Do not wait for this app to decide what to do. Contact trained help now.</p><IonButton color="danger" routerLink="/help-now">Get help now</IonButton></div>}
        </section>

        <section className="onboarding-suggestions">
          <h2>Your starting signals</h2>
          <p>These can be changed later. Tendergrove records observations; it does not diagnose their cause.</p>
          <ul>{suggested.map((signal) => <li key={signal.name}>{signal.name}</li>)}</ul>
        </section>

        <IonItem lines="none"><IonCheckbox checked={addSelf} onIonChange={(e) => setAddSelf(e.detail.checked)}>Add me too, so I can notice burnout, sleep, meals, and when support helps</IonCheckbox></IonItem>
        <IonButton expand="block" disabled={!name.trim() || unsafe === null || saving} onClick={() => void finish()}>{saving ? 'Setting things up…' : 'Start the first check-in'}</IonButton>
        <p className="legal-note">Tendergrove cannot diagnose schizophrenia or another condition and cannot determine whether hospital care is needed. Use a qualified clinician or emergency service for those decisions.</p>
      </IonContent>
    </IonPage>
  )
}

export default OnboardingPage
