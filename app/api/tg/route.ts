import { NextRequest, NextResponse } from 'next/server';

const PROXY_SECRET = process.env.PROXY_SECRET || 'my-super-secret-key';

function checkSecret(req: NextRequest): boolean {
   const secret =
      req.headers.get('x-proxy-secret') ||
      req.nextUrl.searchParams.get('secret');
   return secret === PROXY_SECRET;
}

export async function POST(req: NextRequest) {
   if (!checkSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
         headers: { 'Content-Type': 'application/json' },
      });
   } catch (error: unknown) {
      if (error instanceof Error) {
         console.error('Proxy POST error:', error);
         return NextResponse.json({ error: error.message }, { status: 500 });
      }
      // Handle other types of errors
   }
}

export async function GET(req: NextRequest) {
   if (!checkSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
         headers: { 'Content-Type': 'application/json' },
      });
   } catch (error: unknown) {
      if (error instanceof Error) {
         console.error('Proxy GET error:', error);
         return NextResponse.json({ error: error.message }, { status: 500 });
      }
      // Handle other types of errors
   }
}