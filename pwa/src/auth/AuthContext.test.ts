import { describe, expect, it } from 'vitest'
import type { AuthUser } from 'aws-amplify/auth'

import { isGroveAdmin, isGroveScoreOwner } from './AuthContext'

describe('Grove Score owner access', () => {
  it('recognizes the owner email from Amplify sign-in details', () => {
    const user = {
      username: 'cognito-sub',
      userId: 'owner',
      signInDetails: { loginId: 'Bryant@BryantJames.com' },
    } as AuthUser

    expect(isGroveScoreOwner(user)).toBe(true)
  })

  it('does not expose owner access to other accounts', () => {
    const user = {
      username: 'someone@example.com',
      userId: 'someone',
    } as AuthUser

    expect(isGroveScoreOwner(user)).toBe(false)
    expect(isGroveScoreOwner()).toBe(false)
  })

  it('recognizes the verified Cognito email for social sign-in accounts', () => {
    const user = {
      username: 'Google_123',
      userId: 'owner',
    } as AuthUser

    expect(isGroveScoreOwner(user, 'bryant@bryantjames.com')).toBe(true)
  })
})

describe('Grove admin access', () => {
  it('recognizes verified Bryant James domain accounts', () => {
    expect(
      isGroveAdmin(
        {
          username: 'Google_123',
          userId: 'admin',
        } as AuthUser,
        'analytics@BryantJames.com',
      ),
    ).toBe(true)
  })

  it('rejects lookalike and unrelated domains', () => {
    expect(
      isGroveAdmin({
        username: 'person@bryantjames.com.example',
        userId: 'other',
      } as AuthUser),
    ).toBe(false)
    expect(isGroveAdmin(undefined, 'person@example.com')).toBe(false)
  })
})
