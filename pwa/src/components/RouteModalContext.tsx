import { createContext, useContext } from 'react'

interface RouteModalContextValue {
  readonly isRouteModal: boolean
  readonly dismiss: (targetPath?: string) => void
}

const RouteModalContext = createContext<RouteModalContextValue>({
  isRouteModal: false,
  dismiss: () => undefined,
})

export const RouteModalProvider = RouteModalContext.Provider

/**
 * Provides modal-route dismissal controls to pages rendered inside route modals.
 * @returns Modal route state and dismiss function.
 */
export function useRouteModal() {
  return useContext(RouteModalContext)
}
