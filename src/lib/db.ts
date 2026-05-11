import { PrismaClient } from '@prisma/client'

// Override system DATABASE_URL with PostgreSQL Neon connection
// The system env may have an old SQLite path, so we ensure the correct URL is used
const NEON_DATABASE_URL = 'postgresql://neondb_owner:npg_pi6qTMJUg5yk@ep-misty-dew-acdbyy9l-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'

if (process.env.DATABASE_URL?.startsWith('file:')) {
  process.env.DATABASE_URL = NEON_DATABASE_URL
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
