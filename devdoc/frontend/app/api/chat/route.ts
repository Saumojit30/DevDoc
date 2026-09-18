import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000"

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const res = await fetch(`${BACKEND}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { "content-type": "application/json" } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
