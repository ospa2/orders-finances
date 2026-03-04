import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';



export async function GET(request: Request) {
   const { searchParams } = new URL(request.url);
   const date = searchParams.get('date');

   // Получаем одну запись, где id — это имя вашей категории
   const { data, error } = await supabase
      .from('global_stats')
      .select('payload')
      .eq('id', 'morningPriceStats')
      .single();

   if (error) return NextResponse.json({ error: error.message }, { status: 500 });

   let result = data.payload;

   // Если payload — это массив, и передана дата, фильтруем внутри кода
   if (Array.isArray(result) && date) {
      result = result.filter((item) => item.date === date);
   }

   return NextResponse.json(result);
}

export async function POST(request: Request) {
   const body = await request.json(); // { date, samples, ... }

   const { data, error } = await supabase
      .from('global_stats')
      .upsert({
         id: 'morningPriceStats',
         payload: body,
         updated_at: new Date().toISOString()
      })
      .select();

   if (error) return NextResponse.json({ error: error.message }, { status: 500 });
   return NextResponse.json(data);
}