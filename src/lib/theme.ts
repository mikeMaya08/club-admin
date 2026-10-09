import { useSyncExternalStore } from 'react'

const KEY = 'club:theme' // shared by all apps (same origin)
export type Theme = 'light' | 'dark'
const listeners = new Set<() => void>()

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'dark' || v === 'light' ? v : null
  } catch {
    return null
  }
}

/** Saved choice, otherwise the operating system preference. */
export function currentTheme(): Theme {
  return stored() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

export function applyTheme() {
  const theme = currentTheme()
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

export function toggleTheme() {
  try {
    localStorage.setItem(KEY, currentTheme() === 'dark' ? 'light' : 'dark')
  } catch {
    // storage unavailable: the choice only lasts until reload
  }
  applyTheme()
  listeners.forEach((l) => l())
}

export const useTheme = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    currentTheme,
  )
