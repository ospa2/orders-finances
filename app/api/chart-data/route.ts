// route.ts

import { supabase } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"
import { calculateMonthlySpread, transformOrdersToChartData } from "@/lib/pnl"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = Number(searchParams.get('from')) || 0;
  const to = Number(searchParams.get('to')) || 299;

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("Time", { ascending: false })
    .range(from, to); // Запрашиваем конкретный диапазон

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // --- ИСПРАВЛЕННЫЙ БЛОК ---
  // Используем правильные ключи для доступа к данным,
  // которые приходят из Supabase.
  const chartData = transformOrdersToChartData(
    (orders || []).map((o) => ({
      "Order No.": o["Order No."], // Используем o["Order No."] вместо o.order_no
      Type: o.Type,               // Используем o.Type вместо o.type
      "Fiat Amount": Number(o["Fiat Amount"]), // Используем o["Fiat Amount"]
      Price: Number(o.Price),
      "Coin Amount": Number(o["Coin Amount"]), // Используем o["Coin Amount"]
      Counterparty: o.Counterparty,
      Status: o.Status,           // Используем o.Status вместо o.status
      Time: o.Time,
    }))
  )
  const monthlySpread = calculateMonthlySpread(orders || []);

  return NextResponse.json({ chartData, monthlySpread })
}