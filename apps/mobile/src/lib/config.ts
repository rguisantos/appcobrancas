/**
 * App configuration. In a real build, these would come from environment variables
 * or a config file injected at build time.
 */

// Base URL of the backend API
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000' // Android emulator localhost
  : 'https://your-production-domain.com'

export const SYNC_BATCH_SIZE = 500
export const SYNC_PULL_PAGE_SIZE = 1000
