import { IonIcon } from '@ionic/react'
import { alarmOutline, chevronForwardOutline } from 'ionicons/icons'

import './PastDataNotice.css'

interface PastDataNoticeProps {
  readonly selectedDateLabel: string
  readonly onReturnToToday: () => void
  readonly className?: string
}

/**
 * Calls out that the current view is showing older household data.
 * @param {PastDataNoticeProps} param0
 * @param {string} param0.selectedDateLabel
 * @param {() => void} param0.onReturnToToday
 * @param {string | undefined} param0.className
 * @returns {React.JSX.Element}
 * @constructor
 */
export function PastDataNotice({
  selectedDateLabel,
  onReturnToToday,
  className,
}: PastDataNoticeProps): React.JSX.Element {
  const rootClassName = ['past-data-notice', className].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={rootClassName}
      onClick={onReturnToToday}
      aria-label="Return to today"
    >
      <span className="past-data-notice__icon">
        <IonIcon
          icon={alarmOutline}
          aria-hidden="true"
        />
      </span>
      <span className="past-data-notice__copy">
        <strong>You’re viewing {selectedDateLabel}.</strong>
        <span>Tap to return to today.</span>
      </span>
      <IonIcon
        icon={chevronForwardOutline}
        aria-hidden="true"
      />
    </button>
  )
}
