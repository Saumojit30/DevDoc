import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000"

export async function GET(req: NextRequest) { return proxy(req) }
export async function POST(req: NextRequest) { return proxy(req) }
export async function PUT(req: NextRequest) { return proxy(req) }
export async function DELETE(req: NextRequest) { return proxy(req) }
export async function PATCH(req: NextRequest) { return proxy(req) }

async function proxy(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname.replace("/api", "")
    const qs = req.nextUrl.search
    const url = `${BACKEND}/api${path}${qs}`
    const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined
    const res = await fetch(url, {
      method: req.method,
      headers: {
        "content-type": req.headers.get("content-type") || "application/json",
        accept: "application/json",
      },
      body,
    })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e), stack: e.stack }, { status: 502 })
  }
}
