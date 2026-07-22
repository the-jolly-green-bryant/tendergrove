const PREFIX = 'tendergrove:account:'

export const accountStorageKey = (accountId: string | undefined, name: string): string =>
  `${PREFIX}${accountId ?? 'signed-out'}:${name}`

export const clearAccountStorage = (accountId: string | undefined): void => {
  const prefix = `${PREFIX}${accountId ?? 'signed-out'}:`
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // Storage may be unavailable in private browsing or restricted webviews.
  }
}
