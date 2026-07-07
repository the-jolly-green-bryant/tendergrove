import React from 'react'

/**
 * The gentle low-data state. We never leave a caregiver staring at an empty
 * chart wondering if they did something wrong — we explain what's happening and
 * what will help, warmly.
 */
export function PatternsEmptyState({
  title = 'Patterns are still taking shape',
  message,
}: {
  readonly title?: string
  readonly message: string
}): React.JSX.Element {
  return (
    <div className="pattern-empty">
      <span
        className="pattern-empty__emoji"
        aria-hidden="true"
      >
        🌿
      </span>
      <h2 className="pattern-empty__title">{title}</h2>
      <p className="pattern-empty__message">{message}</p>
    </div>
  )
}
