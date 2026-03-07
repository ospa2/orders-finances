// route.ts

import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { calculateMonthlySpread, Order, transformOrdersToChartData } from "@/lib/pnl"
import { PostgrestError } from "@supabase/supabase-js";

export async function GET() {

  const PAGE_SIZE = 300;
  const results = await Promise.all([
    supabase.from("orders").select("*").range(0, PAGE_SIZE - 1),
    supabase.from("orders").select("*").range(PAGE_SIZE, PAGE_SIZE * 2 - 1),
    supabase.from("orders").select("*").range(PAGE_SIZE * 2, PAGE_SIZE * 3 - 1),
    supabase.from("orders").select("*").range(PAGE_SIZE * 3, PAGE_SIZE * 4 - 1),
    supabase.from("orders").select("*").range(PAGE_SIZE * 4, PAGE_SIZE * 5 - 1),
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