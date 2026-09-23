import { NextRequest, NextResponse } from 'next/server';

const PROXY_SECRET = process.env.PROXY_SECRET || 'my-super-secret-key';

// Разрешаем запросы с Bybit и локальной разработки
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:5173',
  'https://www.bybit.com',
  'https://bybit.com',
];

function getCorsHeaders(origin: string | null) {
  // Проверяем, разрешен ли этот origin (или разрешаем все, если origin не передан)
  const isAllowed = !origin || ALLOWED_ORIGINS.some(o => 
    origin.startsWith(o) || origin.includes('bybit.com')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-proxy-secret',
    'Access-Control-Max-Age': '86400',
  };
}

function checkSecret(req: NextRequest): boolean {
  const secret =
    req.headers.get('x-proxy-secret') ||
    req.nextUrl.searchParams.get('secret');
  return secret === PROXY_SECRET;
}

// Обработка preflight запроса (браузер отправляет OPTIONS перед POST)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { 
      status: 401,
      headers: corsHeaders 
    });
  }

  try {
    const path = req.nextUrl.pathname.replace('/api/tg/', '');
    const telegramUrl = `https://api.telegram.org/${path}`;

    const body = await req.json();

    const tgResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await tgResponse.text();
    return new NextResponse(data, {
      status: tgResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Proxy POST error:', error);
    return NextResponse.json({ error: error.message }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { 
      status: 401,
      headers: corsHeaders 
    });
  }

  try {
    const path = req.nextUrl.pathname.replace('/api/tg/', '');
    const url = new URL(`https://api.telegram.org/${path}`);

    req.nextUrl.searchParams.forEach((value, key) => {
      if (key !== 'secret') url.searchParams.append(key, value);
    });

    const tgResponse = await fetch(url.toString());
    const data = await tgResponse.text();

    return new NextResponse(data, {
      status: tgResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Proxy GET error:', error);
    return NextResponse.json({ error: error.message }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}