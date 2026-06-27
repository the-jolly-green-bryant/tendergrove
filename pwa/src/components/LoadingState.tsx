import { IonSpinner } from '@ionic/react'
import React from 'react'

interface LoadingStateProps {
  readonly className?: string
  readonly name?:
    | 'bubbles'
    | 'circles'
    | 'circular'
    | 'crescent'
    | 'dots'
    | 'lines'
    | 'lines-sharp'
    | 'lines-sharp-small'
    | 'lines-small'
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  className = 'person-page__center',
  name,
}) => {
  return (
    <div className={className}>
      <IonSpinner name={name} />
    </div>
  )
}
