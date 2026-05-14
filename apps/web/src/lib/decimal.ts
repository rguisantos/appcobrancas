/**
 * Utility for converting Prisma Decimal values to numbers.
 * Prisma returns Decimal objects for @db.Decimal fields, but most
 * API responses and calculations expect plain numbers.
 */

import { Prisma } from '@prisma/client'

/** Convert a Prisma Decimal to a JavaScript number. */
export function toNumber(value: Prisma.Decimal | null | undefined): number {
  if (value == null) return 0
  return Number(value)
}

/** Safely add two Decimal/number values and return a number. */
export function addDecimals(a: Prisma.Decimal | number | null | undefined, b: Prisma.Decimal | number | null | undefined): number {
  return toNumber(a as Prisma.Decimal) + toNumber(b as Prisma.Decimal)
}

/** Safely subtract two Decimal/number values and return a number. */
export function subDecimals(a: Prisma.Decimal | number | null | undefined, b: Prisma.Decimal | number | null | undefined): number {
  return toNumber(a as Prisma.Decimal) - toNumber(b as Prisma.Decimal)
}

/** Convert a Decimal field to a safe JSON-serializable number, rounding to 2 decimal places. */
export function toMoney(value: Prisma.Decimal | null | undefined): number {
  const num = toNumber(value)
  return Math.round(num * 100) / 100
}
