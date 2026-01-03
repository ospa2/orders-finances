"use client"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useChartData } from "@/lib/сhartDataProvider";
import { ChartPoint, Order } from "@/lib/pnl";
import { useState, useEffect } from "react";
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
export const calculateCycleVelocity = (
   orders: Order[],
   timeRange: "7d" | "30d" | "90d"
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
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
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
export function SectionCards() {
  
  const { chartData, timeRange } = useChartData();
  const totalRevenue = chartData.reduce((acc, curr) => acc + curr.revenue, 0).toFixed();
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
        <Card className="@container/card">
           <CardHeader>
              <CardDescription>Growth Rate</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                 4.5%
              </CardTitle>
              <CardAction>
                 <Badge variant="outline">
                    <IconTrendingUp />
                    +4.5%
                 </Badge>
              </CardAction>
           </CardHeader>
           <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                 Steady performance increase{" "}
                 <IconTrendingUp className="size-4" />
              </div>
              <div className="text-muted-foreground">
                 Meets growth projections
              </div>
           </CardFooter>
        </Card>
     </div>
  );
}
