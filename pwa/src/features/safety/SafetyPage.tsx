import {
  IonButton,
  IonCard,
  IonCardContent,
  IonInput,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from '@ionic/react'
import {
  callOutline,
  chatbubbleEllipsesOutline,
  heartOutline,
  locationOutline,
  peopleOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { useAppAuth } from '../../auth/AuthContext'
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
  const { user } = useAppAuth()
  const accountId = user?.userId
  const [settings, setSettings] = useState(() => readSafetySettings(accountId))
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setSettings(readSafetySettings(accountId))
    setSaved(false)
  }, [accountId])
  const resource = crisisResource(settings.country)
  const update = <K extends keyof SafetySettings>(key: K, value: SafetySettings[K]) => {
    setSaved(false)
    setSettings((current) => ({ ...current, [key]: value }))
  }

  return (
    <Page title="Get help now" backHref="/dashboard" className="safety-page">
      <section className="safety-page__intro">
        <span className="safety-page__intro-icon"><IonIcon icon={heartOutline} /></span>
        <p className="safety-page__eyebrow">Support is available right now</p>
        <h1>You don’t have to decide alone.</h1>
        <p>If something feels unsafe or beyond what you can manage, connect with a trained person now.</p>
      </section>

      <IonList inset className="safety-page__region">
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

      <section className="safety-page__urgent" role="alert">
        <div className="safety-page__section-heading">
          <IonIcon icon={shieldCheckmarkOutline} />
          <div><p>Immediate danger</p><h2>Call emergency services</h2></div>
        </div>
        <p>If anyone may act on thoughts of harm, cannot stay safe, has a weapon, or needs urgent medical attention, call now.</p>
        {resource.emergency ? (
          <IonButton className="safety-page__emergency-button" expand="block" color="danger" href={`tel:${resource.emergency}`}>
            <IonIcon slot="start" icon={callOutline} />
            Call {resource.emergency}
          </IonButton>
        ) : (
          <IonButton className="safety-page__emergency-button" expand="block" color="danger" href={resource.href}>Find immediate help</IonButton>
        )}
        <div className="safety-page__steps">
          <span><IonIcon icon={peopleOutline} /> Stay nearby if it is safe for you.</span>
          <span><IonIcon icon={locationOutline} /> Move away from weapons, traffic, or other hazards.</span>
        </div>
      </section>

      <section className="safety-page__support">
        <div className="safety-page__section-heading">
          <IonIcon icon={chatbubbleEllipsesOutline} />
          <div><p>Need support or help deciding?</p><h2>Talk with a crisis counselor</h2></div>
        </div>
        <p>A trained counselor can listen, help you think through what is happening, and discuss next steps.</p>
        <IonButton expand="block" href={resource.href}><IonIcon slot="start" icon={callOutline} />{resource.label}</IonButton>
        {resource.text && <IonButton expand="block" fill="outline" href={resource.text}><IonIcon slot="start" icon={chatbubbleEllipsesOutline} />Text a crisis counselor</IonButton>}
      </section>

      <IonCard className="safety-page__plan">
        <IonCardContent>
          <p className="safety-page__eyebrow">For the next hard moment</p>
          <h2>My short safety plan</h2>
          <p>Keep a few practical details ready. This plan stays on this device and is not monitored.</p>
          <IonList>
            <IonItem><IonInput label="Trusted person" labelPlacement="stacked" value={settings.trustedContact} onIonInput={(e) => update('trustedContact', e.detail.value ?? '')} /></IonItem>
            <IonItem><IonInput type="tel" label="Trusted person’s phone" labelPlacement="stacked" value={settings.trustedPhone} onIonInput={(e) => update('trustedPhone', e.detail.value ?? '')} /></IonItem>
            <IonItem><IonTextarea label="A safer place I can go" labelPlacement="stacked" value={settings.safePlace} onIonInput={(e) => update('safePlace', e.detail.value ?? '')} /></IonItem>
            <IonItem><IonTextarea label="Things that help for the next 10 minutes" labelPlacement="stacked" value={settings.calmingSteps} onIonInput={(e) => update('calmingSteps', e.detail.value ?? '')} /></IonItem>
          </IonList>
          <div className="safety-page__plan-actions">
            {settings.trustedPhone && <IonButton fill="outline" href={`tel:${settings.trustedPhone}`}>Call {settings.trustedContact || 'trusted person'}</IonButton>}
            <IonButton onClick={() => { writeSafetySettings(accountId, settings); setSaved(true) }}>Save safety plan</IonButton>
          </div>
          {saved && <IonLabel className="safety-page__saved" color="success">Saved on this device.</IonLabel>}
        </IonCardContent>
      </IonCard>

      <p className="safety-page__disclaimer">Grove is an observation and organization tool. It does not diagnose a condition, predict an emergency, provide medical advice, or replace professional care. Resource availability and services vary by location.</p>
    </Page>
  )
}

export default SafetyPage
