import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

/**
 * Generates the next sequential identifier for a given entity.
 * Format: {prefix}{number} with zero-padded digits (e.g., C001, C002, P001)
 * 
 * Wrapped in a serializable transaction to prevent race conditions
 * when multiple requests generate identifiers concurrently.
 * 
 * @param prefix - The prefix for the identifier (e.g., 'C' for Client, 'P' for Product)
 * @param modelName - The Prisma model name to query
 * @param fieldName - The field name that holds the identifier
 * @param padLength - Number of digits to pad to (default: 4)
 * @returns The next sequential identifier string
 */
export async function generateNextIdentifier(
  prefix: string,
  modelName: 'cliente' | 'produto',
  fieldName: string = 'identificador',
  padLength: number = 4
): Promise<string> {
  return db.$transaction(async (tx) => {
    const records = await (tx[modelName] as any).findMany({
      where: { [fieldName]: { startsWith: prefix }, deletedAt: null },
      select: { [fieldName]: true },
      orderBy: { [fieldName]: 'desc' },
      take: 1,
    })

    if (records.length === 0) {
      return `${prefix}${String(1).padStart(padLength, '0')}`
    }

    const lastIdentifier = records[0][fieldName] as string
    const numericPart = lastIdentifier.replace(prefix, '')
    const lastNumber = parseInt(numericPart, 10)

    if (isNaN(lastNumber)) {
      const count = await (tx[modelName] as any).count({
        where: { [fieldName]: { startsWith: prefix }, deletedAt: null },
      })
      return `${prefix}${String(count + 1).padStart(padLength, '0')}`
    }

    return `${prefix}${String(lastNumber + 1).padStart(padLength, '0')}`
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

/**
 * Generates a unique identifier with retry logic in case of collisions.
 */
export async function generateUniqueIdentifier(
  prefix: string,
  modelName: 'cliente' | 'produto',
  fieldName: string = 'identificador',
  padLength: number = 3,
  maxRetries: number = 5
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const identifier = await generateNextIdentifier(prefix, modelName, fieldName, padLength)
    
    // Check if it already exists (collision check)
    const existing = await (db[modelName] as any).findFirst({
      where: {
        [fieldName]: identifier,
        deletedAt: null,
      },
    })
    
    if (!existing) {
      return identifier
    }
  }
  
  // Fallback: use timestamp-based suffix to guarantee uniqueness
  const timestamp = Date.now().toString(36).toUpperCase()
  return `${prefix}${timestamp}`
}
