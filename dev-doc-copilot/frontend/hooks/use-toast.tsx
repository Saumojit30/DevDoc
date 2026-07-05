"use client"

import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react"

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: "success" | "error" | "info"
}

type Action =
  | { type: "ADD"; toast: Toast }
  | { type: "REMOVE"; id: string }

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case "ADD": return [...state, action.toast]
    case "REMOVE": return state.filter(t => t.id !== action.id)
    default: return state
  }
}

function genId() {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

const ToastContext = createContext<{
  toasts: Toast[]
  toast: (t: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
}>({ toasts: [], toast: () => {}, dismiss: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = genId()
    dispatch({ type: "ADD", toast: { ...t, id } })
    setTimeout(() => dispatch({ type: "REMOVE", id }), 4000)
  }, [])

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id })
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast: addToast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
