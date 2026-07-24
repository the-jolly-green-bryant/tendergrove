import { describe, expect, it } from 'vitest'
import { appRoutes } from './AppShell'
import { menuItems } from '../components/Page'

describe('application navigation', () => {
  it('has unique route paths', () => {
    const paths = appRoutes.map(({ path }) => path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('registers every menu destination', () => {
    const paths = new Set(appRoutes.map(({ path }) => path))
    for (const item of menuItems) expect(paths.has(item.href)).toBe(true)
  })

  it('keeps safety help and data controls reachable', () => {
    const paths = appRoutes.map(({ path }) => path)
    expect(paths).toContain('/help-now')
    expect(paths).toContain('/settings')
    expect(paths).toContain('/privacy')
    expect(paths).toContain('/terms')
  })

  it('keeps research and methodology in the main menu', () => {
    expect(menuItems.some((item) => item.href === '/about/research')).toBe(true)
  })
})
