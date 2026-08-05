import { useEffect, useRef } from "react"

export function useHoverAutoExpand(
  hoveredFolderId: string | null,
  expand: (id: string) => void,
  delayMs = 600,
): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentId = useRef<string | null>(null)

  useEffect(() => {
    if (hoveredFolderId === currentId.current) return
    currentId.current = hoveredFolderId
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (hoveredFolderId) {
      const id = hoveredFolderId
      timer.current = setTimeout(() => expand(id), delayMs)
    }
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [hoveredFolderId, expand, delayMs])
}
