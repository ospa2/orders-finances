import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
   const { data, error } = await supabase
      .from("cards")
      .select("*")
      .order("id"); // Стабильная сортировка

   if (error) return NextResponse.json({ error: error.message }, { status: 400 });

   return NextResponse.json(data);
}

export async function POST(request: Request) {
   try {
      // Принимаем orderId с фронтенда
      const { orderId, id, amount, reason } = await request.json();

      if (!id || typeof amount !== "number") {
         return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      const actionReason = reason || 'manual';

      // Вызываем новую безопасную функцию
      const { data, error } = await supabase
         .rpc('update_card_balance_safe', {
            p_order_id: orderId || null, // Передаем null, если это ручной запрос без ордера
            p_card_id: id,
            p_amount: amount,
            p_reason: actionReason
         });

      if (error) {
         console.error("RPC Error:", error);
         return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Обработка случая, когда сработал предохранитель идемпотентности
      if (data?.warning) {
         console.warn(`[Idempotency Warning]: ${data.warning} for order ${orderId}`);
      }

      return NextResponse.json(data);
   } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
   }
}