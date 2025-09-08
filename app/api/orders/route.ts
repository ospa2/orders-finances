// /api/orders/route.ts

import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  
  try {
    const order = await req.json()

    // --- ИСПРАВЛЕННЫЙ БЛОК ---
    // Ключи объекта теперь точно соответствуют именам столбцов в вашей схеме
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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
  console.error("API route error:", err)
  return NextResponse.json({ error: (err as Error).message }, { status: 500 })
}
}