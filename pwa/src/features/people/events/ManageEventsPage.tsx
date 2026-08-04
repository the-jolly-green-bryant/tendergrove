import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonAlert,
} from '@ionic/react'
import {
  add,
  calendarOutline,
  createOutline,
  informationCircleOutline,
  trash,
} from 'ionicons/icons'
import { useParams } from 'react-router-dom'

import { LoadingState } from '../../../components/LoadingState'
import { AppDisclaimer } from '../../../components/AppDisclaimer'
import { usePerson } from '../usePerson'
import { useHouseholdLifeEvents, type LifeEvent } from './useLifeEvents'
import { useLifeEventMutations } from './useLifeEventMutations'

type AlertValues = { label?: string }

const normalizeLabel = (values: AlertValues): string | false =>
  values.label?.trim() || false

const useEventAlertActions = (householdId: string | undefined, events: LifeEvent[]) => {
  const { create, rename, remove } = useLifeEventMutations(householdId)
  const [presentAlert] = useIonAlert()

  const nextSortOrder =
    events.reduce((max, e) => Math.max(max, e.sortOrder ?? -1), -1) + 1

  const reportError = (error: unknown) =>
    void presentAlert({
      header: 'Couldn’t save',
      message: error instanceof Error ? error.message : 'Please try again.',
      buttons: ['OK'],
    })

  const addEvent = () =>
    void presentAlert({
      header: 'Add Event',
      message: 'Give your event a clear name.',
      inputs: [
        { name: 'label', type: 'text', placeholder: 'e.g. Therapy Appointment' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (values: AlertValues) => {
            const label = normalizeLabel(values)
            if (!label) return false
            create(label, nextSortOrder).catch(reportError)
            return true
          },
        },
      ],
    })

  const editEvent = (event: LifeEvent) =>
    void presentAlert({
      header: 'Edit Event',
      inputs: [
        { name: 'label', type: 'text', value: event.label, placeholder: 'Event name' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (values: AlertValues) => {
            const label = normalizeLabel(values)
            if (!label) return false
            rename(event.id, label).catch(reportError)
            return true
          },
        },
      ],
    })

  const deleteEvent = (event: LifeEvent) =>
    void presentAlert({
      header: 'Remove event?',
      message: `“${event.label}” will no longer appear in check-ins.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => void remove(event.id).catch(reportError),
        },
      ],
    })

  return { addEvent, editEvent, deleteEvent }
}

const EventsIntro = () => (
  <div className="indicator-why">
    <IonIcon
      icon={informationCircleOutline}
      color="primary"
    />
    <div>
      <strong>What are events?</strong>
      <p>
        Events are things that happen in a day that can influence behaviors — like
        school, therapy, or a trip. They’re shared across everyone in the household, and
        you check off the ones that occurred during each person’s check-in.
      </p>
    </div>
  </div>
)

const EventRow = ({
  event,
  onEdit,
  onDelete,
}: {
  readonly event: LifeEvent
  readonly onEdit: (event: LifeEvent) => void
  readonly onDelete: (event: LifeEvent) => void
}) => (
  <IonItem className="indicator-row">
    <IonIcon
      slot="start"
      icon={calendarOutline}
      color="primary"
    />
    <IonLabel>{event.label}</IonLabel>
    <IonButton
      slot="end"
      fill="clear"
      aria-label={`Edit ${event.label}`}
      onClick={() => onEdit(event)}
    >
      <IonIcon
        slot="icon-only"
        icon={createOutline}
      />
    </IonButton>
    <IonButton
      slot="end"
      fill="clear"
      color="danger"
      aria-label={`Delete ${event.label}`}
      onClick={() => onDelete(event)}
    >
      <IonIcon
        slot="icon-only"
        icon={trash}
      />
    </IonButton>
  </IonItem>
)

const ManageEventsPage = () => {
  const { personId } = useParams<{ personId: string }>()
  const { data: person, isLoading: isLoadingPerson } = usePerson(personId)
  const householdId = person?.householdId
  const { data: events, isLoading, error } = useHouseholdLifeEvents(householdId)
  const isPageLoading = isLoadingPerson || isLoading
  const { addEvent, editEvent, deleteEvent } = useEventAlertActions(
    householdId,
    events ?? [],
  )

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={`/person/${personId}`}
              text=""
            />
          </IonButtons>
          <IonTitle>Events</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
        <p className="indicator-intro">
          Track common events that may influence behaviors.
        </p>
        <EventsIntro />

        {isPageLoading && (
          <LoadingState
            variant="list"
            label="Loading events"
            rows={4}
          />
        )}
        {error && <p>Failed to load events.</p>}

        {!isPageLoading && !error && (
          <section className="indicator-group">
            <div className="section-header">
              <h2>Your Events</h2>
            </div>
            {(events ?? []).length === 0 ? (
              <p className="section-empty">
                No events yet. Add the ones that come up often.
              </p>
            ) : (
              <IonList
                lines="none"
                className="indicator-list"
              >
                {(events ?? []).map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    onEdit={editEvent}
                    onDelete={deleteEvent}
                  />
                ))}
              </IonList>
            )}
          </section>
        )}

        <div className="wizard-footer">
          <IonButton
            expand="block"
            onClick={addEvent}
          >
            <IonIcon
              slot="start"
              icon={add}
            />
            Add Event
          </IonButton>
        </div>
        <AppDisclaimer />
      </IonContent>
    </IonPage>
  )
}

export default ManageEventsPage
