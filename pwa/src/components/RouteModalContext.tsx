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

export const useRouteModal = () => useContext(RouteModalContext)
