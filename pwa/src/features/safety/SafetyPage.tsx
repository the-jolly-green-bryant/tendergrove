import {
  IonButton,
  IonCard,
  IonCardContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from '@ionic/react'
import { useState } from 'react'
import { Page } from '../../components/Page'
import {
  readSafetySettings,
  SafetySettings,
  writeSafetySettings,
} from './safetyStorage'

const crisisResource = (country: SafetySettings['country']) => {
  switch (country) {
    case 'US': return { label: 'Call 988', href: 'tel:988', text: 'sms:988', emergency: '911' }
    case 'CA': return { label: 'Call 9-8-8', href: 'tel:988', text: 'sms:988', emergency: '911' }
    case 'GB': return { label: 'Call Samaritans at 116 123', href: 'tel:116123', text: '', emergency: '999' }
    case 'AU': return { label: 'Call Lifeline at 13 11 14', href: 'tel:131114', text: 'sms:0477131114', emergency: '000' }
    default: return { label: 'Find a local crisis line', href: 'https://findahelpline.com/', text: '', emergency: '' }
  }
}

const SafetyPage = () => {
  const [settings, setSettings] = useState(readSafetySettings)
  const [saved, setSaved] = useState(false)
  const resource = crisisResource(settings.country)
  const update = <K extends keyof SafetySettings>(key: K, value: SafetySettings[K]) => {
    setSaved(false)
    setSettings((current) => ({ ...current, [key]: value }))
  }

  return (
    <Page title="Get help now" backHref="/dashboard" className="safety-page">
      <section className="safety-page__urgent" role="alert">
        <h1>If anyone may be in immediate danger</h1>
        <p>Stay with them if it is safe, move away from weapons or other hazards, and contact trained help now.</p>
        <IonButton expand="block" color="danger" href={resource.href}>{resource.label}</IonButton>
        {resource.text && <IonButton expand="block" color="danger" fill="outline" href={resource.text}>Text a crisis counselor</IonButton>}
        {resource.emergency && (
          <IonButton expand="block" fill="outline" color="danger" href={`tel:${resource.emergency}`}>
            Call emergency services ({resource.emergency})
          </IonButton>
        )}
        <p className="safety-page__note">Tendergrove cannot determine whether an emergency is happening. If you are unsure, contact a qualified crisis service or emergency professional.</p>
      </section>

      <IonList inset>
        <IonItem>
          <IonSelect label="Country or region" value={settings.country} onIonChange={(event) => update('country', event.detail.value)}>
            <IonSelectOption value="US">United States</IonSelectOption>
            <IonSelectOption value="CA">Canada</IonSelectOption>
            <IonSelectOption value="GB">United Kingdom</IonSelectOption>
            <IonSelectOption value="AU">Australia</IonSelectOption>
            <IonSelectOption value="OTHER">Other</IonSelectOption>
          </IonSelect>
        </IonItem>
      </IonList>

      <IonCard>
        <IonCardContent>
          <h2>My short safety plan</h2>
          <p>Keep a few practical details ready. This stays on this device and is not monitored.</p>
          <IonList>
            <IonItem><IonInput label="Trusted person" labelPlacement="stacked" value={settings.trustedContact} onIonInput={(e) => update('trustedContact', e.detail.value ?? '')} /></IonItem>
            <IonItem><IonInput type="tel" label="Trusted person’s phone" labelPlacement="stacked" value={settings.trustedPhone} onIonInput={(e) => update('trustedPhone', e.detail.value ?? '')} /></IonItem>
            <IonItem><IonTextarea label="A safer place I can go" labelPlacement="stacked" value={settings.safePlace} onIonInput={(e) => update('safePlace', e.detail.value ?? '')} /></IonItem>
            <IonItem><IonTextarea label="Things that help for the next 10 minutes" labelPlacement="stacked" value={settings.calmingSteps} onIonInput={(e) => update('calmingSteps', e.detail.value ?? '')} /></IonItem>
          </IonList>
          {settings.trustedPhone && <IonButton fill="outline" href={`tel:${settings.trustedPhone}`}>Call {settings.trustedContact || 'trusted person'}</IonButton>}
          <IonButton onClick={() => { writeSafetySettings(settings); setSaved(true) }}>Save safety plan</IonButton>
          {saved && <IonLabel color="success"> Saved on this device.</IonLabel>}
        </IonCardContent>
      </IonCard>

      <p className="safety-page__disclaimer">Tendergrove is an observation and organization tool. It does not diagnose a condition, predict an emergency, provide medical advice, or replace professional care. Resources require clinical and legal review before public release.</p>
    </Page>
  )
}

export default SafetyPage
