import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing"

export const orderBefore = (next: string | null): string =>
  generateKeyBetween(null, next)

export const orderAfter = (prev: string | null): string =>
  generateKeyBetween(prev, null)

export const orderBetween = (
  prev: string | null,
  next: string | null,
): string => generateKeyBetween(prev, next)

export const orderNAfter = (prev: string | null, count: number): string[] =>
  generateNKeysBetween(prev, null, count)

export const compareOrder = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0
