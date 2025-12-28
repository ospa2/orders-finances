import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  // CORS заголовки
  const headers = new Headers()
  headers.set("Access-Control-Allow-Credentials", "true")
  headers.set("Access-Control-Allow-Origin", "https://www.bybit.com") // <-- только домен
  headers.set("Access-Control-Allow-Methods", "GET,DELETE,PATCH,POST,PUT,OPTIONS")
  headers.set(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  )

  try {
    const order = await req.json()

    const { error } = await supabase.from("orders").insert({
      "Order No.": order["Order No."],
      "Type": order.Type,
      "Fiat Amount": order["Fiat Amount"],
      "Price": order.Price,
      "Coin Amount": order["Coin Amount"],
      "Counterparty": order.Counterparty,
      "Status": order.Status,
      "Time": order.Time,
    })

    if (error) {
      console.error("Supabase insert error:", error)
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
        headers,
      })
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    })
  } catch (err: unknown) {
    console.error("API route error:", err)
    return new NextResponse(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers }
    )
  }
}
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? ""
  const isAllowed = process.env.ALLOWED_ORIGINS!.includes(origin)

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : process.env.ALLOWED_ORIGINS![0],
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
  }
}

export async function GET(req: Request) {
  const headers = getCorsHeaders(req)

  try {
    // Извлекаем параметры из URL для гибкости (например, /api/orders?limit=50)
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get("limit")) || 100
    const status = searchParams.get("status")

    let query = supabase
      .from("orders")
      .select("*")
      .order("Time", { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq("Status", status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400, headers })
    }

    return NextResponse.json(data, { status: 200, headers })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500, headers }
    )
  }
}

// OPTIONS должен возвращать те же динамические заголовки
export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req)
  })
}
