import Decimal from "decimal.js";

export type Order = {
  "Order No.": number;
  Type: "BUY" | "SELL";
  "Fiat Amount": number;
  Price: number;
  "Coin Amount": number;
  Counterparty: string;
  Status: "Completed" | "Canceled" | string;
  Time: string; // Ожидается "YYYY-MM-DD HH:mm:ss" или ISO "YYYY-MM-DDTHH:mm:ss+Z"
};

export type ChartPoint = {
  date: string;
  buy: number;
  sell: number;
  revenue: number;
};

export interface MonthlySpread {
  [month: string]: number;
}

type Lot = {
  qty: Decimal;
  fiat: Decimal;
};

const DUST_TOLERANCE = new Decimal('1e-12');

/**
 * Извлекает YYYY-MM-DD, поддерживая пробел или 'T' в качестве разделителя времени.
 */
const extractDate = (timeStr: string): string => timeStr.split(/[ T]/)[0];

export function transformOrdersToChartData(
  orders: Order[],
  initialInventory: Lot[] = []
): ChartPoint[] {

  const sorted = orders
    .filter(o => o.Status?.toLowerCase() === "completed")
    .slice()
    .sort((a, b) => new Date(a.Time).getTime() - new Date(b.Time).getTime());

  const inventory: Lot[] = initialInventory.map(lot => ({
    qty: new Decimal(lot.qty),
    fiat: new Decimal(lot.fiat)
  }));

  const dailyMap: Record<string, { buy: Decimal; sell: Decimal; revenue: Decimal }> = {};

  for (const o of sorted) {
    const date = extractDate(o.Time); // Теперь корректно вернет "2025-02-14" для любых форматов

    if (!dailyMap[date]) {
      dailyMap[date] = { buy: new Decimal(0), sell: new Decimal(0), revenue: new Decimal(0) };
    }

    const type = o.Type.toUpperCase();
    const isFiatValid = typeof o["Fiat Amount"] === "number" && Number.isFinite(o["Fiat Amount"]);
    const fiatAmount = new Decimal(isFiatValid ? o["Fiat Amount"]! : o.Price * o["Coin Amount"]);
    const coinAmt = new Decimal(o["Coin Amount"]);

    let remainingQty = coinAmt;
    let remainingFiat = fiatAmount;

    if (type === "BUY") {
      while (remainingQty.gt(0) && inventory.length > 0 && inventory[0].qty.isNegative()) {
        const shortLot = inventory[0];
        const shortQtyAbs = shortLot.qty.abs();
        const matched = Decimal.min(remainingQty, shortQtyAbs);

        const matchedProceeds = shortLot.fiat.mul(matched.div(shortQtyAbs));
        const matchedBuyCost = remainingFiat.mul(matched.div(remainingQty));

        const realized = matchedProceeds.sub(matchedBuyCost);
        dailyMap[date].revenue = dailyMap[date].revenue.add(realized);

        shortLot.qty = shortLot.qty.add(matched);
        shortLot.fiat = shortLot.fiat.sub(matchedProceeds);

        if (shortLot.qty.abs().lte(DUST_TOLERANCE)) inventory.shift();

        remainingQty = remainingQty.sub(matched);
        remainingFiat = remainingFiat.sub(matchedBuyCost);
      }

      if (remainingQty.gt(0)) {
        inventory.push({ qty: remainingQty, fiat: remainingFiat });
      }
      dailyMap[date].buy = dailyMap[date].buy.add(fiatAmount);

    } else if (type === "SELL") {
      while (remainingQty.gt(0) && inventory.length > 0 && inventory[0].qty.isPositive()) {
        const lot = inventory[0];
        const matched = Decimal.min(lot.qty, remainingQty);

        const matchedCost = lot.fiat.mul(matched.div(lot.qty));
        const matchedRevenue = remainingFiat.mul(matched.div(remainingQty));

        const realized = matchedRevenue.sub(matchedCost);
        dailyMap[date].revenue = dailyMap[date].revenue.add(realized);

        lot.qty = lot.qty.sub(matched);
        lot.fiat = lot.fiat.sub(matchedCost);

        if (lot.qty.lte(DUST_TOLERANCE)) inventory.shift();

        remainingQty = remainingQty.sub(matched);
        remainingFiat = remainingFiat.sub(matchedRevenue);
      }

      if (remainingQty.gt(0)) {
        inventory.push({ qty: remainingQty.neg(), fiat: remainingFiat });
      }
      dailyMap[date].sell = dailyMap[date].sell.add(fiatAmount);
    }
  }

  return Object.entries(dailyMap)
    .map(([date, vals]) => ({
      date,
      buy: vals.buy.toNumber(),
      sell: vals.sell.toNumber(),
      revenue: vals.revenue.toNumber(),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ... calculateMonthlySpread остается без изменений

export function calculateMonthlySpread(orders: Order[]): MonthlySpread[] {
  // Группируем по месяцам
  const monthlyData: {
    [key: string]: {
      buyOrders: Order[];
      sellOrders: Order[];
    };
  } = {};

  orders.forEach(o => {
    // Парсим дату и получаем ключ месяца (например, "2025-11")
    const date = new Date(o.Time);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        buyOrders: [],
        sellOrders: []
      };
    }

    // Разделяем по типу ордера
    if (o.Type === 'BUY') {
      monthlyData[monthKey].buyOrders.push(o);
    } else if (o.Type === 'SELL') {
      monthlyData[monthKey].sellOrders.push(o);
    }
  });

  // Рассчитываем спред для каждого месяца и формируем результат
  const spreads: MonthlySpread[] = Object.entries(monthlyData).map(([month, data]) => {
    const { buyOrders, sellOrders } = data;

    // Средняя цена покупки
    const avgBuyPrice = buyOrders.length > 0
      ? buyOrders.reduce((sum, o) => sum + o.Price, 0) / buyOrders.length
      : 0;

    // Средняя цена продажи
    const avgSellPrice = sellOrders.length > 0
      ? sellOrders.reduce((sum, o) => sum + o.Price, 0) / sellOrders.length
      : 0;

    // Спред в процентах
    const spreadPercent = avgBuyPrice > 0
      ? ((avgSellPrice - avgBuyPrice) / avgBuyPrice) * 100
      : 0;

    // Возвращаем объект с месяцем как ключ и спредом как значение
    return {
      [month]: Number(spreadPercent.toFixed(2))
    };
  });

  // Сортируем по месяцам
  return spreads.sort((a, b) => {
    const monthA = Object.keys(a)[0];
    const monthB = Object.keys(b)[0];
    return monthA.localeCompare(monthB);
  });
}