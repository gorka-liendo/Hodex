import { useEffect, useState } from 'react'

/** Devuelve `value` solo cuando lleva `delayMs` sin cambiar (búsquedas al teclear). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
