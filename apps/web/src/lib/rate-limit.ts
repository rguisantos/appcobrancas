/**
 * Simple in-memory rate limiter for login attempts.
 * Uses a sliding window approach.
 * In production with multiple instances, use Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const attempts = new Map<string, RateLimitEntry>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of attempts) {
    if (now > entry.resetAt) {
      attempts.delete(key)
    }
  }
}, 10 * 60 * 1000)

export function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; resetAtMs: number } {
  const now = Date.now()
  const entry = attempts.get(identifier)

  if (!entry || now > entry.resetAt) {
    attempts.set(identifier, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1, resetAtMs: now + WINDOW_MS }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0, resetAtMs: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - entry.count, resetAtMs: entry.resetAt }
}

export function resetRateLimit(identifier: string) {
  attempts.delete(identifier)
}
