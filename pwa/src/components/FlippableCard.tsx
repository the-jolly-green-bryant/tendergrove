import { IonCard } from '@ionic/react'
import { useId, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'

export interface FlippableCardProps
  extends Omit<ComponentProps<typeof IonCard>, 'title'> {
  /** Optional reverse-side content. When present, the card gets a flip control. */
  readonly back?: ReactNode
  readonly front?: ReactNode
  /** Static header slots that remain visible when the body eventually flips. */
  readonly kicker?: ReactNode
  readonly title?: ReactNode
  readonly description?: ReactNode
}

export const FlippableCard = ({
  children,
  front,
  back,
  kicker,
  title,
  description,
  className = '',
  ...cardProps
}: FlippableCardProps) => {
  const [showBack, setShowBack] = useState(false)
  const generatedId = useId()
  const bodyId = `flippable-card-${generatedId.replaceAll(':', '')}`

  return (
    <div className="flippable-card-shell">
      <div
        id={bodyId}
        className="flippable-card-stage"
        data-has-card-back={back ? 'true' : undefined}
        data-card-side={showBack ? 'back' : 'front'}
      >
        <IonCard
          {...cardProps}
          className={`flippable-card flippable-card__face flippable-card__face--front ${className}`.trim()}
          aria-hidden={showBack}
        >
          {(kicker || title || description) && (
            <header className="flippable-card__header">
              {kicker && <div className="flippable-card__kicker">{kicker}</div>}
              {title && <h2 className="flippable-card__title">{title}</h2>}
              {description && (
                <div className="flippable-card__description">{description}</div>
              )}
            </header>
          )}
          <div className="flippable-card__front-content">
            {front ?? children}
          </div>
        </IonCard>
        {back && (
          <IonCard
            className="flippable-card flippable-card__face flippable-card__face--back"
            aria-hidden={!showBack}
          >
            <div className="flippable-card__back-scroll">{back}</div>
          </IonCard>
        )}
      </div>
      {back && (
        <button
          type="button"
          className="flippable-card__toggle"
          aria-controls={bodyId}
          aria-expanded={showBack}
          onClick={() => setShowBack((current) => !current)}
        >
          <span aria-hidden="true">↻</span>
          {showBack ? 'Back to the chart' : 'Tap for more info'}
        </button>
      )}
    </div>
  )
}
