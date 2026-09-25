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
    const contentType = req.headers.get("content-type") || "application/json"
    
    let body: BodyInit | undefined = undefined
    if (req.method !== "GET" && req.method !== "HEAD") {
      const buffer = await req.arrayBuffer()
      body = Buffer.from(buffer)
    }

    const res = await fetch(url, {
      method: req.method,
      headers: {
        "content-type": contentType,
        accept: "application/json",
      },
      body,
    })
    const arrayBuf = await res.arrayBuffer()
    return new NextResponse(arrayBuf, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e), stack: e.stack }, { status: 502 })
  }
}
