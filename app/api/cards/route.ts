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

// Ожидаемый формат body: { id: string, amount: number }
// amount - сумма операции (дельта), а не новый баланс
export async function POST(request: Request) {
   try {
      const { id, amount } = await request.json();

      if (!id || typeof amount !== "number") {
         return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      // 1. Получаем текущий баланс
      const { data: currentCard, error: fetchError } = await supabase
         .from("cards")
         .select("balance")
         .eq("id", id)
         .single();

      if (fetchError || !currentCard) {
         return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }

      // 2. Вычисляем новый баланс
      const newBalance = currentCard.balance + amount;

      // 3. Обновляем баланс с флагом is_system для триггера
      const { error: updateError } = await supabase
         .from("cards")
         .update({
            balance: newBalance,
            is_system: true
         } as Record<string, unknown>)
         .eq("id", id);

      if (updateError) {
         return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, newBalance });
   } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
   }
}