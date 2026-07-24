import { IonButton, IonInput, IonItem, IonLabel, IonList, IonToggle } from '@ionic/react'
import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { useAppAuth } from '../../auth/AuthContext'
import {
  readReminder,
  scheduleReminder,
  type ReminderValue,
} from './reminderNotifications'

export const ReminderSettings = () => {
  const { user } = useAppAuth()
  const accountId = user?.userId
  const [value, setValue] = useState(() => readReminder(accountId))
  const [saved, setSaved] = useState(false)
  const [deliveryMessage, setDeliveryMessage] = useState('')
  useEffect(() => {
    setValue(readReminder(accountId))
    setSaved(false)
  }, [accountId])
  const save = async (next = value) => {
    setValue(next)
    try {
      const scheduled = await scheduleReminder(accountId, next)
      setValue(scheduled)
      setSaved(true)
      setDeliveryMessage(Capacitor.isNativePlatform()
        ? next.enabled ? `A device notification is scheduled for ${next.time}.` : 'Device notifications are turned off.'
        : 'Preference saved. Browser delivery is not available; install the mobile app to receive notifications.')
    } catch {
      setSaved(false)
      setDeliveryMessage('The reminder could not be scheduled. Check notification permission in device settings.')
    }
  }
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
    {deliveryMessage && <p className="legal-note">{deliveryMessage}</p>}
    {!deliveryMessage && !Capacitor.isNativePlatform() && <p className="legal-note">Browser delivery is not available. Install the mobile app to receive reminders.</p>}
  </section>
}
