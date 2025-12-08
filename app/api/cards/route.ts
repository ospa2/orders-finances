import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
   const { data, error } = await supabase
      .from("cards")
      .select("*");

   if (error) return NextResponse.json({ error }, { status: 400 });

   return NextResponse.json(data);
}

export async function POST(request: Request) {
   const body = await request.json();

   // Массив объектов
   const { error } = await supabase
      .from("cards")
      .upsert(body); // upsert → обновляет если id совпадает

   if (error) return NextResponse.json({ error }, { status: 400 });

   return NextResponse.json({ success: true });
}