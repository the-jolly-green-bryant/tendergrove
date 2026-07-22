import { describe, expect, it } from 'vitest'

import { accountStorageKey } from './accountStorage'

describe('account-scoped device storage', () => {
  it('uses a different key for each authenticated account', () => {
    expect(accountStorageKey('account-a', 'safety-plan')).not.toBe(
      accountStorageKey('account-b', 'safety-plan'),
    )
  })
})
