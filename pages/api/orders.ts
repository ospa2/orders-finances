import type { NextApiRequest, NextApiResponse } from "next";

// Тип ордера, который приходит из скрипта
interface IncomingOrder {
  itemId: string;
  side: "buy" | "sell";
  quantity: string; // $
  amount: string;   // ₽
  curPrice: string; // курс
  time?: number;    // время на клиенте (опционально)
}

// Тип сохранённого ордера на сервере
interface StoredOrder extends IncomingOrder {
  device: string;     // с какого устройства пришёл
  receivedAt: number; // когда сервер принял
}

// Память сервера (при перезапуске очистится)
let orders: StoredOrder[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { device, orders: newOrders } = req.body as {
      device: string;
      orders: IncomingOrder[];
    };

    if (!device || !Array.isArray(newOrders)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const stampedOrders: StoredOrder[] = newOrders.map((o) => ({
      ...o,
      device,
      receivedAt: Date.now(),
    }));

    orders = orders.concat(stampedOrders);

    return res.status(200).json({
      success: true,
      added: stampedOrders.length,
      total: orders.length,
    });
  }

  if (req.method === "GET") {
    return res.status(200).json(orders);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
