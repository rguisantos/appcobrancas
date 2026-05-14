/**
 * Fetch client wrapper that automatically handles 401 responses
 * by redirecting the user to re-authenticate.
 */

let logoutHandler: (() => void) | null = null

/**
 * Register the logout handler from the auth store.
 * Called once during app initialization.
 */
export function registerLogoutHandler(handler: () => void) {
  logoutHandler = handler
}

/**
 * Enhanced fetch that intercepts 401 responses and triggers logout.
 * This handles the case where a JWT expires mid-session or a session
 * is revoked server-side.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init)

  // If we get a 401, the session has expired or been revoked
  if (response.status === 401 && logoutHandler) {
    logoutHandler()
  }

  return response
}
