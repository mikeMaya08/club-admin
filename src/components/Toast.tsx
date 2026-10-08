import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Kind = 'success' | 'error' | 'info'
interface Item {
  id: number
  message: string
  kind: Kind
}

const ToastContext = createContext<(message: string, kind?: Kind) => void>(() => {})
export const useToast = () => useContext(ToastContext)

const STYLES: Record<Kind, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-slate-800',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const nextId = useRef(0)

  const push = useCallback((message: string, kind: Kind = 'info') => {
    const id = ++nextId.current
    setItems((list) => [...list, { id, message, kind }])
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 3000) // auto-dismiss after 3s
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        data-testid="toast-container"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            data-testid="toast"
            data-kind={t.kind}
            className={`pointer-events-auto w-full max-w-sm rounded-lg px-4 py-3 text-sm text-white shadow-lg ${STYLES[t.kind]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
