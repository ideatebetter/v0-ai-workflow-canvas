import { useEffect, useRef } from "react"

export function useDebouncedEffect(
  effect: () => void,
  deps: unknown[],
  delayMs: number,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedEffect = useRef(effect)
  savedEffect.current = effect

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => savedEffect.current(), delayMs)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delayMs])
}
