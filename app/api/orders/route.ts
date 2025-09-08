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

// Обработка preflight (OPTIONS)
export async function OPTIONS() {
  const headers = new Headers()
  headers.set("Access-Control-Allow-Credentials", "true")
  headers.set("Access-Control-Allow-Origin", "https://www.bybit.com")
  headers.set("Access-Control-Allow-Methods", "GET,DELETE,PATCH,POST,PUT,OPTIONS")
  headers.set(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  )

  return new NextResponse(null, { status: 200, headers })
}
