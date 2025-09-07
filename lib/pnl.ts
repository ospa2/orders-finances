// pnl.ts
import Decimal from "decimal.js";

export type Order = {
  "Order No.": number;
  Type: "BUY" | "SELL";
  "Fiat Amount": number; // total fiat (cost for BUY, proceeds for SELL) -- may include fees if your export does
  Price: number;
  "Coin Amount": number;
  Counterparty: string;
  Status: "Completed" | "Canceled" | string;
  Time: string; // "YYYY-MM-DD HH:mm:ss"
};

export type ChartPoint = {
  date: string;
  buy: number;   // потрачено на покупки (фиат)
  sell: number;  // получено от продаж (фиат)
  revenue: number; // реализованная прибыль (фиат)
};

type Lot = {
  qty: Decimal;   // положительное = лонг, отрицательное = шорт
  fiat: Decimal;  // для лонга: потрачено на этот lot; для шорта: получено (proceeds)
};

function dayOf(ts: string): string {
  return ts.slice(0, 10); // "YYYY-MM-DD"
}

function toNum(d: Decimal): number {
  // возвращаем Number с округлением до 2 знаков для фиата
  return Number(d.toFixed(2));
}

/**
 * transformOrdersToChartData - FIFO с точными расчётами на decimal.js
 */
export function transformOrdersToChartData(orders: Order[]): ChartPoint[] {
  
  // сортируем по времени (возрастание)
  const sorted = orders.filter(o => (o["Status"] ?? "").toLowerCase() === "completed")
    .slice()
    .sort((a, b) => new Date(a.Time).getTime() - new Date(b.Time).getTime());

  // FIFO inventory (массив лотов)
  const inventory: Lot[] = [];

  // карта по дням
  const dailyMap: Record<string, { buy: Decimal; sell: Decimal; revenue: Decimal }> = {};

  for (const o of sorted) {
    const date = dayOf(o.Time);
    if (!dailyMap[date]) dailyMap[date] = { buy: new Decimal(0), sell: new Decimal(0), revenue: new Decimal(0) };

    const type = o.Type.toUpperCase();
    // Берём Fiat Amount если он заполнен (более корректно), иначе считаем Price * CoinAmount
    const fiatAmount = new Decimal(Number.isFinite(o["Fiat Amount"]) ? o["Fiat Amount"] : o.Price * o["Coin Amount"]);
    const coinAmt = new Decimal(o["Coin Amount"]);

    if (type === "BUY") {
      // сначала закрываем шорты (если они есть)
      let remainingQty = coinAmt;
      let remainingFiat = fiatAmount;

      while (remainingQty.gt(0) && inventory.length > 0 && inventory[0].qty.lt(0)) {
        const shortLot = inventory[0];
        const shortQtyAbs = shortLot.qty.abs();
        const matched = Decimal.min(remainingQty, shortQtyAbs);

        // пропорциональная часть от shortLot.fiat (это были proceeds при открытии шорта)
        const matchedProceeds = shortLot.fiat.mul(matched.div(shortQtyAbs));
        // пропорциональная часть от текущ BUY fiat
        const matchedBuyCost = remainingFiat.mul(matched.div(remainingQty));

        // При покрытии шорта: realized = proceeds_from_short - cost_to_buy_back
        const realized = matchedProceeds.sub(matchedBuyCost);
        dailyMap[date].revenue = dailyMap[date].revenue.add(realized);

        // уменьшаем shortLot
        shortLot.qty = shortLot.qty.add(matched); // qty is negative, add towards 0
        shortLot.fiat = shortLot.fiat.sub(matchedProceeds);
        if (shortLot.qty.abs().lte(new Decimal(1e-12))) inventory.shift();

        // уменьшаем remaining BUY
        remainingQty = remainingQty.sub(matched);
        remainingFiat = remainingFiat.sub(matchedBuyCost);
      }

      // остаток BUY становится новым лотом (лонг)
      if (remainingQty.gt(0)) {
        inventory.push({ qty: remainingQty, fiat: remainingFiat });
      }

      // учитываем в дневной бухгалтерии buy
      dailyMap[date].buy = dailyMap[date].buy.add(fiatAmount);

    } else if (type === "SELL") {
      // SELL: сначала покрываем лонги (FIFO)
      let remainingQty = coinAmt;
      let remainingFiat = fiatAmount; // proceeds to be distributed proportionally

      while (remainingQty.gt(0) && inventory.length > 0 && inventory[0].qty.gt(0)) {
        const lot = inventory[0];
        const available = lot.qty;
        const matched = Decimal.min(available, remainingQty);

        const matchedCost = lot.fiat.mul(matched.div(lot.qty)); // cost portion from lot
        const matchedRevenue = remainingFiat.mul(matched.div(remainingQty)); // revenue portion from this sell

        const realized = matchedRevenue.sub(matchedCost);
        dailyMap[date].revenue = dailyMap[date].revenue.add(realized);

        // уменьшаем lot
        lot.qty = lot.qty.sub(matched);
        lot.fiat = lot.fiat.sub(matchedCost);
        if (lot.qty.lte(new Decimal(1e-12))) inventory.shift();

        // уменьшаем remaining sell
        remainingQty = remainingQty.sub(matched);
        remainingFiat = remainingFiat.sub(matchedRevenue);
      }

      // если осталось количество для продажи -> открываем шорт (qty отрицательное, fiat = proceeds)
      if (remainingQty.gt(0)) {
        inventory.push({ qty: remainingQty.neg(), fiat: remainingFiat });
        // реализация прибыли для новой открытой шорт-позиции откладывается до её покрытия
      }

      // учитываем в дневной бухгалтерии sell
      dailyMap[date].sell = dailyMap[date].sell.add(fiatAmount);

    } else {
      // игнорируем неизвестные типы
      continue;
    }
  }

  // Конвертируем dailyMap в массив ChartPoint (sorted)
  const points: ChartPoint[] = Object.entries(dailyMap)
    .map(([date, vals]) => ({
      date,
      buy: toNum(vals.buy),
      sell: toNum(vals.sell),
      revenue: toNum(vals.revenue),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return points;
}
