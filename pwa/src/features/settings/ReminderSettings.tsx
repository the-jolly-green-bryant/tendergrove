import { IonButton, IonInput, IonItem, IonLabel, IonList, IonToggle } from '@ionic/react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect, useState } from 'react'
import { useAppAuth } from '../../auth/AuthContext'
import { accountStorageKey } from '../../lib/accountStorage'

interface ReminderValue { enabled: boolean; time: string; skippedDate?: string }
const read = (accountId?: string): ReminderValue => { try { return { enabled: false, time: '20:00', ...JSON.parse(localStorage.getItem(accountStorageKey(accountId, 'gentle-reminder')) ?? '{}') } } catch { return { enabled: false, time: '20:00' } } }

const schedule = async (accountId: string | undefined, value: ReminderValue) => {
  localStorage.setItem(accountStorageKey(accountId, 'gentle-reminder'), JSON.stringify(value))
  if (!Capacitor.isNativePlatform()) return
  await LocalNotifications.cancel({ notifications: Array.from({ length: 7 }, (_, index) => ({ id: 4200 + index })) })
  if (!value.enabled) return
  const permission = await LocalNotifications.requestPermissions()
  if (permission.display !== 'granted') return
  const [hour, minute] = value.time.split(':').map(Number)
  await LocalNotifications.schedule({ notifications: Array.from({ length: 7 }, (_, index) => ({
    id: 4200 + index,
    title: 'A quiet moment to remember',
    body: 'If today is not the day, you can skip without losing anything.',
    schedule: { on: { weekday: index + 1, hour, minute }, repeats: true },
  })) })
}

export const ReminderSettings = () => {
  const { user } = useAppAuth()
  const accountId = user?.userId
  const [value, setValue] = useState(() => read(accountId))
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setValue(read(accountId))
    setSaved(false)
  }, [accountId])
  const save = async (next = value) => { setValue(next); await schedule(accountId, next); setSaved(true) }
  const notToday = () => void save({ ...value, skippedDate: new Date().toISOString().slice(0, 10) })
  return <section>
    <h2>Gentle reminders</h2>
    <p>No streaks and no guilt. Check in when you can; days you miss simply stay blank and do not change the picture.</p>
    <IonList inset>
      <IonItem><IonToggle checked={value.enabled} onIonChange={(event) => setValue((current) => ({ ...current, enabled: event.detail.checked }))}>Daily reminder</IonToggle></IonItem>
      <IonItem><IonInput type="time" label="Quiet reminder time" value={value.time} onIonInput={(event) => setValue((current) => ({ ...current, time: event.detail.value ?? '20:00' }))} /></IonItem>
    </IonList>
    <IonButton onClick={() => void save()}>Save reminder</IonButton>
    <IonButton fill="clear" onClick={notToday}>Not today</IonButton>
    {saved && <IonLabel color="success"> Preference saved.</IonLabel>}
    {!Capacitor.isNativePlatform() && <p className="legal-note">Notification delivery becomes available in the installed mobile app. Your preference is saved here.</p>}
  </section>
}
