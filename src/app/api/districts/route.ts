import { NextResponse } from 'next/server'
import { DISTRICTS } from '@/lib/districts'

export async function GET() {
  return NextResponse.json({ districts: DISTRICTS.map(({ key, mr, en }) => ({ key, mr, en })) })
}
