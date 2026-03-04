import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';



export async function GET() {

   // Получаем одну запись, где id — это имя вашей категории
   const { data, error } = await supabase
      .from('flexible_data')
      .select('payload')
      .eq('id', 'morningPriceStats')
      .single();

   if (error) return NextResponse.json({ error: error.message }, { status: 500 });

   const result = data.payload;

   return NextResponse.json(result);
}

export async function POST(request: Request) {
   const body = await request.json(); // { date, samples, ... }

   const { data, error } = await supabase
      .from('flexible_data')
      .upsert({
         id: 'morningPriceStats',
         payload: body,
         updated_at: new Date().toISOString()
      })
      .select();

   if (error) return NextResponse.json({ error: error.message }, { status: 500 });
   return NextResponse.json(data);
}