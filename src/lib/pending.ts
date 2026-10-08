import { useSyncExternalStore } from 'react'

let count = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Counts store calls that are still waiting (e.g. because of ?latency=). */
export function trackPending<T>(promise: Promise<T>): Promise<T> {
  count++
  emit()
  return promise.finally(() => {
    count--
    emit()
  })
}

export const usePending = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => count,
  )
