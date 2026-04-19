"use client";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
   Card,
   CardAction,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { useChartData } from "@/hooks/сhartDataProvider";
import { ChartPoint, Order } from "@/lib/pnl";
import { useState, useEffect } from "react";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";
import { IconCoin } from "@tabler/icons-react";
// Функция для получения даты N дней назад (осталась без изменений)
function getDateDaysAgo(days: number, today: Date): Date {
   const d = new Date(today);
   d.setDate(today.getDate() - days);
   // Для сравнения устанавливаем время на 00:00:00
   d.setHours(0, 0, 0, 0);
   return d;
}

/**
 * Расчет среднего времени удержания позиции (Inventory Age) по FIFO.
 * Возвращает время в минутах.
 */
/**
 * Расчет средней скорости оборота (Cycle Velocity)
 * Фокус на: Точность FIFO, безопасность типов, фильтрация по периоду
 */
const calculateCycleVelocity = (
   orders: Order[],
   timeRange: "7d" | "30d" | "90d",
): number => {
   if (!orders || orders.length === 0) return 0;

   const now = Date.now();
   const rangeMs = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
   }[timeRange];

   // 1. Фильтруем только исполненные и парсим время один раз для оптимизации
   const processedOrders = orders
      .filter((o) => o.Status === "Completed")
      .map((o) => ({
         ...o,
         timestamp: new Date(o.Time).getTime(),
      }))
      .filter((o) => o.timestamp > now - rangeMs)
      .sort((a, b) => a.timestamp - b.timestamp);

   const buyQueue: { amount: number; time: number }[] = [];
   const cycleDurations: number[] = [];

   // 2. FIFO Logic
   for (const order of processedOrders) {
      if (order.Type === "BUY") {
         buyQueue.push({
            amount: order["Coin Amount"],
            time: order.timestamp,
         });
      } else if (order.Type === "SELL") {
         let sellAmount = order["Coin Amount"];

         while (sellAmount > 0 && buyQueue.length > 0) {
            const earliestBuy = buyQueue[0];
            const matchedAmount = Math.min(earliestBuy.amount, sellAmount);

            cycleDurations.push(order.timestamp - earliestBuy.time);

            earliestBuy.amount -= matchedAmount;
            sellAmount -= matchedAmount;

            if (earliestBuy.amount <= 0) {
               buyQueue.shift();
            }
         }
      }
   }

   if (cycleDurations.length === 0) return 0;

   const avgMs =
      cycleDurations.reduce((a, b) => a + b, 0) / cycleDurations.length;

   // Возвращаем минуты
   return Math.round(avgMs / 60000);
};
// Функция для форматирования даты в строку "YYYY-MM-DD" (осталась без изменений)
function formatDate(date: Date): string {
   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, "0");
   const day = String(date.getDate()).padStart(2, "0");
   return `${year}-${month}-${day}`;
}

// 🆕 НОВАЯ ФУНКЦИЯ: Извлекает часть "YYYY-MM-DD" из полного формата даты
function extractDatePart(fullDateString: string): string {
   // Входящий формат: "2025-11-16 06:20:29.325+00"
   // Мы можем безопасно извлечь первые 10 символов, которые соответствуют "YYYY-MM-DD".
   return fullDateString.substring(0, 10);
}

function calculateRevenue(data: ChartPoint[]) {
   // Устанавливаем сегодняшнюю дату на 00:00:00 для точных расчетов
   const today = new Date();
   today.setHours(0, 0, 0, 0);

   // --- 1. Расчет дат для фиксированных периодов ---

   // Текущий месяц (с 1 числа)
   const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

   // Текущая неделя (с понедельника)
   const dayOfWeek = today.getDay();
   const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
   const startOfWeek = new Date(today);
   startOfWeek.setDate(today.getDate() - daysToSubtract);
   startOfWeek.setHours(0, 0, 0, 0);

   // Последние N дней (диапазон [N дней назад, Сегодня])
   const startLast7Days = getDateDaysAgo(6, today);
   const startLast30Days = getDateDaysAgo(29, today);
   const startLast90Days = getDateDaysAgo(89, today);

   // --- 2. Функция для фильтрации и суммирования ---

   const calculateTotal = (startDate: Date, endDate: Date = today) => {
      // Форматируем даты начала и конца периода в "YYYY-MM-DD"
      const startStr = formatDate(startDate);
      const endStr = formatDate(endDate);

      return data.reduce((total, item) => {
         // 🔑 Извлекаем "YYYY-MM-DD" из полной строки даты в ChartPoint
         const itemDatePart = extractDatePart(item.date);

         // Включаем даты, которые >= startStr и <= endStr
         if (itemDatePart >= startStr && itemDatePart <= endStr) {
            return total + item.revenue;
         }
         return total;
      }, 0);
   };

   // --- 3. Выполнение расчетов (без изменений) ---

   return {
      // Фиксированные периоды
      thisWeek: calculateTotal(startOfWeek).toFixed(0),
      thisMonth: calculateTotal(startOfMonth).toFixed(0),

      // Плавающие периоды
      last7Days: calculateTotal(startLast7Days).toFixed(0),
      last30Days: calculateTotal(startLast30Days).toFixed(0),
      last90Days: calculateTotal(startLast90Days).toFixed(0),
   };
}
const formatVelocity = (minutes: number): string => {
   if (minutes === 0) return "0 min";
   if (minutes < 60) return `${minutes} min`;
   if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

   const days = Math.floor(minutes / 1440);
   const hours = Math.floor((minutes % 1440) / 60);
   return `${days}d ${hours}h`;
};
function CardCycleVelocity({ minutes }: { minutes: number }) {
   // Целевой показатель — 24 часа (1440 минут)
   const isStagnant = minutes > 1440;
   const isOptimal = minutes > 0 && minutes <= 1440;

   return (
      <Card className="@container/card">
         <CardHeader>
            <CardDescription>Cycle Velocity</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
               {formatVelocity(minutes)}
            </CardTitle>
            <CardAction>
               <Badge
                  variant="outline"
                  className={
                     isOptimal
                        ? "text-emerald-500 border-emerald-500/20"
                        : "text-amber-500 border-amber-500/20"
                  }
               >
                  {isStagnant ? (
                     <>
                        <IconTrendingDown className="mr-1 size-3" />
                        Stagnant
                     </>
                  ) : (
                     <>
                        <IconTrendingUp className="mr-1 size-3" />
                        Active
                     </>
                  )}
               </Badge>
            </CardAction>
         </CardHeader>
         <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
               {isStagnant ? "Capital is idle" : "Capital is working"}
            </div>
            <div className="text-muted-foreground">
               {isStagnant
                  ? "Exceeds 24h target cycle"
                  : "Within optimal turnover range"}
            </div>
         </CardFooter>
      </Card>
   );
}

type Lot = {
   price: number;
   amount: number; // оставшийся USDT из этого BUY ордера
};

type PriceGroup = {
   price: number;
   amount: number; // суммарный USDT по этой цене
};

type HoldResult = {
   totalUsdt: number; // всего USDT на руках
   avgPrice: number; // средневзвешенная цена
   groups: PriceGroup[]; // breakdown по ценам
};

/**
 * FIFO расчёт текущего холда USDT.
 * BUY ордера добавляют лоты в очередь, SELL списывают с начала очереди.
 * Оставшиеся лоты группируются по цене.
 */
const HOLD_CORRECTION_USDT = 1180; // реальный холд оказался меньше на эту сумму

function calcHoldFifo(orders: Order[]): HoldResult {
   const completed = orders
      .filter((o) => o.Status === "Completed")
      .sort((a, b) => new Date(a.Time).getTime() - new Date(b.Time).getTime());

   const queue: Lot[] = [];

   for (const order of completed) {
      if (order.Type === "BUY") {
         queue.push({ price: order.Price, amount: order["Coin Amount"] });
      } else if (order.Type === "SELL") {
         let toSell = order["Coin Amount"];
         while (toSell > 1e-9 && queue.length > 0) {
            const front = queue[0];
            if (front.amount <= toSell + 1e-9) {
               toSell -= front.amount;
               queue.shift();
            } else {
               front.amount -= toSell;
               toSell = 0;
            }
         }
      }
   }

   // Вычитаем поправку по FIFO из самых старых лотов
   let correction = HOLD_CORRECTION_USDT;
   while (correction > 1e-9 && queue.length > 0) {
      const front = queue[0];
      if (front.amount <= correction + 1e-9) {
         correction -= front.amount;
         queue.shift();
      } else {
         front.amount -= correction;
         correction = 0;
      }
   }

   if (queue.length === 0) {
      return { totalUsdt: 0, avgPrice: 0, groups: [] };
   }

   const groupMap = new Map<number, number>();
   let totalUsdt = 0;
   let totalCost = 0;

   for (const lot of queue) {
      groupMap.set(lot.price, (groupMap.get(lot.price) ?? 0) + lot.amount);
      totalUsdt += lot.amount;
      totalCost += lot.amount * lot.price;
   }

   const avgPrice = totalCost / totalUsdt;

   const groups: PriceGroup[] = Array.from(groupMap.entries())
      .map(([price, amount]) => ({ price, amount }))
      .sort((a, b) => a.price - b.price);

   return { totalUsdt, avgPrice, groups };
}

function fmt(n: number, decimals = 2): string {
   return n.toLocaleString("ru-RU", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
   });
}

export function CardUsdtHold() {
   const [hold, setHold] = useState<HoldResult | null>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      // Сначала пробуем кэш для мгновенного рендера
      const cached = localStorage.getItem("orders_cache");
      if (cached) {
         try {
            setHold(calcHoldFifo(JSON.parse(cached)));
            setLoading(false);
         } catch {
            /* ignore */
         }
      }

      // Фоновое обновление с сервера
      fetch("/api/orders")
         .then((r) => r.json())
         .then((orders: Order[]) => {
            setHold(calcHoldFifo(orders));
            setLoading(false);
         })
         .catch(console.error);
   }, []);

   const totalFormatted = hold ? fmt(hold.totalUsdt, 0) : "—";
   const avgFormatted = hold ? fmt(hold.avgPrice, 2) : "—";

   return (
      <Popover>
         <PopoverTrigger asChild>
            <Card className="@container/card cursor-pointer transition-shadow hover:shadow-md">
               <CardHeader>
                  <CardDescription>USDT Hold</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                     {loading ? (
                        <span className="animate-pulse text-muted-foreground text-lg">
                           Loading...
                        </span>
                     ) : (
                        <div className="flex items-center gap-2">
                           <IconCoin className="size-8" />
                           {avgFormatted}
                           {" ₽"}
                           <span className="text-base font-normal text-muted-foreground"></span>
                        </div>
                     )}
                  </CardTitle>
                  <CardAction>
                     <Badge variant="outline">≈ {totalFormatted} USDT</Badge>
                  </CardAction>
               </CardHeader>
               <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                     Average buy price
                  </div>
                  <div className="text-muted-foreground">
                     Click to see details
                  </div>
               </CardFooter>
            </Card>
         </PopoverTrigger>

         <PopoverContent className="w-72 p-0" align="start">
            <div className="px-4 py-3 border-b">
               <p className="text-sm font-semibold">Hold breakdown</p>
               <p className="text-xs text-muted-foreground mt-0.5">
                  Total: {totalFormatted} USDT · avg {avgFormatted} ₽
               </p>
            </div>

            <div className="divide-y max-h-72 overflow-y-auto">
               {hold?.groups.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                     No open positions
                  </p>
               )}
               {hold?.groups.map((g, i) => (
                  <div
                     key={i}
                     className="flex items-center justify-between px-4 py-2.5"
                  >
                     <div className="flex flex-col">
                        <span className="text-sm font-medium">
                           {fmt(g.amount, 0)}{" "}
                           <span className="text-muted-foreground font-normal text-xs">
                              USDT
                           </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                           {((g.amount / (hold.totalUsdt || 1)) * 100).toFixed(
                              1,
                           )}
                           % Hold
                        </span>
                     </div>
                     <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums">
                           {fmt(g.price, 2)} ₽
                        </span>
                     </div>
                  </div>
               ))}
            </div>

            {hold && hold.groups.length > 0 && (
               <div className="px-4 py-2.5 border-t bg-muted/30">
                  <div className="flex justify-between text-xs text-muted-foreground">
                     <span>Hold amount</span>
                     <span className="font-medium text-foreground">
                        ≈ {fmt(hold.totalUsdt * hold.avgPrice, 0)} ₽
                     </span>
                  </div>
               </div>
            )}
         </PopoverContent>
      </Popover>
   );
}
export function SectionCards() {
   const { chartData, timeRange } = useChartData();
   const totalRevenue = chartData
      .reduce((acc, curr) => acc + curr.revenue, 0)
      .toFixed();
   const { last7Days, last30Days, last90Days } = calculateRevenue(chartData);
   const [orders, setOrders] = useState<Order[]>([]); // Типизируйте Order

   useEffect(() => {
      const cached = localStorage.getItem("orders_cache");
      if (cached) {
         try {
            setOrders(JSON.parse(cached));
         } catch (e) {
            console.error("Failed to parse orders_cache", e);
         }
      }
   }, []);

   // Теперь расчеты зависят от состояния
   const cycleVelocity = calculateCycleVelocity(orders, timeRange);
   return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
         <Card className="@container/card">
            <CardHeader>
               <CardDescription>Total Revenue</CardDescription>
               <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {totalRevenue}₽
               </CardTitle>
               <CardAction>
                  <Badge variant="outline">
                     <IconTrendingUp />
                     +12.5%
                  </Badge>
               </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
               <div className="line-clamp-1 flex gap-2 font-medium">
                  Trending up this month <IconTrendingUp className="size-4" />
               </div>
               <div className="text-muted-foreground">
                  Visitors for the last 6 months
               </div>
            </CardFooter>
         </Card>
         <Card className="@container/card">
            <CardHeader>
               <CardDescription>
                  {timeRange === "30d"
                     ? "Last 30 days"
                     : timeRange === "7d"
                       ? "Last 7 days"
                       : "Last 90 days"}
               </CardDescription>
               <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {timeRange === "30d"
                     ? last30Days
                     : timeRange === "7d"
                       ? last7Days
                       : last90Days}
                  ₽
               </CardTitle>
               <CardAction>
                  <Badge variant="outline">
                     <IconTrendingDown />
                     -20%
                  </Badge>
               </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
               <div className="line-clamp-1 flex gap-2 font-medium">
                  Down 20% this period <IconTrendingDown className="size-4" />
               </div>
               <div className="text-muted-foreground">
                  Acquisition needs attention
               </div>
            </CardFooter>
         </Card>
         <CardCycleVelocity minutes={cycleVelocity} />
         <CardUsdtHold />
      </div>
   );
}
