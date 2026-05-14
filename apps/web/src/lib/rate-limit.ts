/**
 * Simple in-memory rate limiter for login attempts.
 * Uses a sliding window approach.
 *
 * IMPORTANT: In-memory only — resets on server restart, doesn't work across
 * multiple instances. For production with multiple instances, use Redis-based
 * rate limiting (e.g., @upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const attempts = new Map<string, RateLimitEntry>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

// Lazy-initialized cleanup — avoids setInterval leak in serverless environments
let cleanupTimer: ReturnType<typeof setInterval> | null = null
let cleanupInitialized = false

function ensureCleanup() {
  if (cleanupInitialized) return
  cleanupInitialized = true

  // Use setImmediate-like pattern for serverless safety:
  // Only start the interval on first use, and use unref() so it
  // doesn't keep the process alive in serverless
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of attempts) {
      if (now > entry.resetAt) {
        attempts.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)

  // Don't prevent process exit in serverless
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = MAX_ATTEMPTS,
  windowMs: number = WINDOW_MS
): { allowed: boolean; remainingAttempts: number; resetAtMs: number } {
  ensureCleanup()
  const now = Date.now()
  const entry = attempts.get(identifier)

  if (!entry || now > entry.resetAt) {
    attempts.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetAtMs: now + windowMs }
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remainingAttempts: 0, resetAtMs: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remainingAttempts: maxAttempts - entry.count, resetAtMs: entry.resetAt }
}

export function resetRateLimit(identifier: string) {
  attempts.delete(identifier)
}
