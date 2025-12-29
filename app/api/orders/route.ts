import { supabase } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

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

const ALLOWED_ORIGINS = [
  "https://www.bybit.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://orders-finances.vercel.app"
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? ""
  // Если origin пустой (например, прямой вызов), разрешаем первый из списка
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version",
  }
}

export async function GET(req: NextRequest) {
  const headers = getCorsHeaders(req)

  try {

    const { searchParams } = new URL(req.url)
    const from = Number(searchParams.get('from'))
    const to = Number(searchParams.get('to'))

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("Time", { ascending: false })
      .range(from, to); // Запрашиваем конкретный диапазон

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400, headers })
    }

    // Всегда возвращаем массив или объект, никогда не возвращаем пустой Response
    return NextResponse.json(data ?? [], { status: 200, headers })

  } catch (err: unknown) {
    console.error("GET Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500, headers }
    )
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req)
  })
}