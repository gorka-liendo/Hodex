import { useEffect } from 'react'

/** Fija el título de la pestaña: `<título> · Hodex`. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · Hodex`
  }, [title])
}
