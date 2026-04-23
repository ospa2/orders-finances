import { Order } from "@/lib/pnl"
import { supabase } from "@/lib/supabase"
import { PostgrestError } from "@supabase/supabase-js"
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

export async function GET() {

  const PAGE_SIZE = 300;
    const results = await Promise.all([
      supabase.from("orders").select("*").range(0, PAGE_SIZE - 1),
      supabase.from("orders").select("*").range(PAGE_SIZE, PAGE_SIZE * 2 - 1),
      supabase.from("orders").select("*").range(PAGE_SIZE * 2, PAGE_SIZE * 3 - 1),
      supabase.from("orders").select("*").range(PAGE_SIZE * 3, PAGE_SIZE * 4 - 1),
      supabase.from("orders").select("*").range(PAGE_SIZE * 4, PAGE_SIZE * 5 - 1),
      supabase.from("orders").select("*").range(PAGE_SIZE * 5, PAGE_SIZE * 6 - 1),
    ]);
  
    const orders: Order[] = [];
    const errors: PostgrestError[] = [];
  
    for (const { data, error } of results) {
      if (error) {
        errors.push(error);
      } else if (data) {
        orders.push(...(data as Order[]));
      }
    }
    if (errors.length > 0) {
      // Возвращаем первую ошибку или агрегированный список
      return NextResponse.json(
        { error: errors[0].message, details: errors },
        { status: 500 }
      );
  }
  return NextResponse.json(orders)
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req)
  })
}