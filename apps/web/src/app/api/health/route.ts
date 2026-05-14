import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'App Cobranças',
      db: 'connected',
    })
  } catch {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'App Cobranças',
      db: 'disconnected',
    }, { status: 503 })
  }
}
