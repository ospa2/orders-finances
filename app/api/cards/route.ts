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
      // Добавляем reason в payload
      // reason: 'order_create' | 'order_cancel' | 'manual'
      const { id, amount, reason } = await request.json();

      if (!id || typeof amount !== "number") {
         return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      // Дефолтное значение для совместимости, если фронт еще не обновлен
      // Если вы делаете ручной запрос через Postman без reason — будет manual
      const actionReason = reason || 'manual';

      const { data, error } = await supabase
         .rpc('update_card_balance', {
            p_card_id: id,
            p_amount: amount,
            p_reason: actionReason
         });

      if (error) {
         console.error("RPC Error:", error);
         return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
   } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
   }
}