import { IonSkeletonText, IonSpinner } from '@ionic/react'
import React from 'react'
import { FlippableCard } from './FlippableCard'

import './LoadingState.css'

export type LoadingStateVariant = 'page' | 'detail' | 'list' | 'form' | 'chart'

interface LoadingStateProps {
  readonly className?: string
  readonly variant?: LoadingStateVariant
  readonly rows?: number
  readonly label?: string
  /** Saving actions remain compact spinners; page loads use skeleton variants. */
  readonly name?: React.ComponentProps<typeof IonSpinner>['name']
}

const Line = ({ width }: { readonly width: string }) => (
  <IonSkeletonText
    animated
    className="loading-skeleton__line"
    style={{ width }}
  />
)

const Card = ({ index }: { readonly index: number }) => (
  <FlippableCard className="loading-skeleton__card">
    <div className="loading-skeleton__card-head">
      <IonSkeletonText
        animated
        className="loading-skeleton__avatar"
      />
      <div className="loading-skeleton__copy">
        <Line width={index % 2 === 0 ? '58%' : '72%'} />
        <Line width={index % 2 === 0 ? '82%' : '64%'} />
      </div>
    </div>
    <Line width="92%" />
  </FlippableCard>
)

const ChartSkeleton = () => (
  <div className="loading-skeleton__chart">
    <div className="loading-skeleton__chart-heading">
      <div>
        <Line width="88px" />
        <Line width="136px" />
      </div>
      <IonSkeletonText
        animated
        className="loading-skeleton__pill"
      />
    </div>
    <IonSkeletonText
      animated
      className="loading-skeleton__plot"
    />
    <IonSkeletonText
      animated
      className="loading-skeleton__segment"
    />
  </div>
)

export const LoadingState: React.FC<LoadingStateProps> = ({
  className = '',
  variant = 'page',
  rows = 3,
  label = 'Loading content',
  name,
}) =>
  name ? (
    <span
      className={className}
      role="status"
      aria-label={label}
    >
      <IonSpinner name={name} />
    </span>
  ) : (
    <div
      className={`loading-skeleton loading-skeleton--${variant} ${className}`.trim()}
      role="status"
      aria-label={label}
    >
      {variant === 'detail' && (
        <div className="loading-skeleton__detail-head">
          <IonSkeletonText
            animated
            className="loading-skeleton__hero-avatar"
          />
          <div className="loading-skeleton__copy">
            <Line width="52%" />
            <Line width="76%" />
          </div>
        </div>
      )}

      {variant === 'form' && (
        <div className="loading-skeleton__form-intro">
          <Line width="46%" />
          <Line width="84%" />
        </div>
      )}

      {(variant === 'chart' || variant === 'detail') && <ChartSkeleton />}

      {variant !== 'chart' &&
        Array.from({ length: rows }, (_, index) => (
          <Card
            key={index}
            index={index}
          />
        ))}
      <span className="loading-skeleton__announcement">{label}</span>
    </div>
  )
