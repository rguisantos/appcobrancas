import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Resolve the PostgreSQL database URL.
 *
 * Handles the case where a system-level DATABASE_URL env var may
 * override the project .env file with an old SQLite path (file:…).
 * When that happens, reads the correct PostgreSQL URL directly from
 * the .env file instead of hardcoding credentials in source code.
 */
function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL

  // If the env already has a valid PostgreSQL URL, use it
  if (envUrl && envUrl.startsWith('postgresql://')) {
    return envUrl
  }

  // System env may override .env with a stale SQLite path — read .env directly
  try {
    const envPath = resolve(process.cwd(), '.env')
    const envContent = readFileSync(envPath, 'utf-8')
    const match = envContent.match(/^DATABASE_URL=(.+)/m)
    if (match?.[1]?.trim().startsWith('postgresql://')) {
      return match[1].trim()
    }
  } catch {
    // .env file not readable — will fall through to error
  }

  throw new Error(
    'DATABASE_URL must be a PostgreSQL connection string. ' +
    'Please set it in your .env file or environment variables.'
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasourceUrl: resolveDatabaseUrl(),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
