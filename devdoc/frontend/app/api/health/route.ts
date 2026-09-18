import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000"

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(3000) })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ status: "error", version: "unknown" }, { status: 502 })
  }
}
