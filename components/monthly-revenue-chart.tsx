"use client";

import React, {
   useState,
   useEffect,
   useMemo,
   useRef,
} from "react";
import {
   Bar,
   BarChart,
   CartesianGrid,
   XAxis,
   YAxis,
   Tooltip,
   ResponsiveContainer,
   Cell,
} from "recharts";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { ChartPoint, MonthlySpread } from "@/lib/pnl";
import { useChartData } from "@/lib/сhartDataProvider";

type MonthSummary = {
   month: string; // "Jan", "Feb", ...
   revenue: number; // сумма revenue за месяц
   avgSpread: number; // (totalSell - totalBuy) / totalBuy, округлён до 2 знаков
   totalBuy: number; // сумма buy
   totalSell: number; // сумма sell
};
interface TooltipPayload {
   payload: MonthSummary;
}
interface BarShapeProps {
   hovered: boolean;
   x?: number;
   y?: number;
   width?: number;
   height?: number;
   fill?: string;
}

function aggregateByMonth(
   data: ChartPoint[],
   monthlySpread: MonthlySpread[],
): MonthSummary[] {
   const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
   ];
   const map = new Map<
      string,
      {
         revenue: number;
         totalBuy: number;
         totalSell: number;
         count: number;
         year: number;
         monthIndex: number;
      }
   >();

   // Создаём Map для быстрого поиска спреда по месяцу
   const spreadMap = new Map<string, number>();
   monthlySpread.forEach((item) => {
      const month = Object.keys(item)[0];
      const spread = item[month];
      spreadMap.set(month, spread);
   });

   for (const { date, buy, sell, revenue } of data) {
      const d = new Date(date);
      if (isNaN(d.getTime())) continue; // пропустить некорректные даты

      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

      const acc = map.get(monthKey) ?? {
         revenue: 0,
         totalBuy: 0,
         totalSell: 0,
         count: 0,
         year,
         monthIndex,
      };
      acc.revenue += revenue;
      acc.totalBuy += buy;
      acc.totalSell += sell;
      acc.count += 1;
      map.set(monthKey, acc);
   }

   const result: MonthSummary[] = Array.from(map.entries())
      .sort((a, b) => {
         // Сортируем по году и месяцу
         const [keyA] = a;
         const [keyB] = b;
         return keyA.localeCompare(keyB);
      })
      .map(([monthKey, acc]) => {
         const { revenue, totalBuy, totalSell, year, monthIndex } = acc;

         // Получаем спред из monthlySpread
         const spreadPercent = spreadMap.get(monthKey) || 0;

         // Конвертируем проценты (2.17) в десятичную дробь (0.0217)
         const avgSpread = spreadPercent / 100;

         return {
            month: `${monthNames[monthIndex]} ${monthNames[monthIndex] === "Jan" ? year : ""}`,
            revenue,
            avgSpread, // храним как десятичную дробь для tooltip
            totalBuy,
            totalSell,
         };
      });

   return result;
}

// Smooth-tooltip wrapper with fade
const CustomTooltip = ({
   active,
   payload,
}: {
   active: boolean;
   payload: TooltipPayload[];
}) => {
   if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
         <div
            style={{
               opacity: 1,
            }}
            className="rounded-lg border bg-background p-3 shadow-lg"
         >
            <p className="text-sm font-semibold mb-2">{data.month}</p>
            <div className="space-y-1 text-sm">
               <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Revenue:</span>
                  <span className="font-medium">
                     {data.revenue.toLocaleString()}₽
                  </span>
               </div>
               <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Avg Spread:</span>
                  <span className="font-medium">
                     {(data.avgSpread * 100).toFixed(2)}%
                  </span>
               </div>
               <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Total Buy:</span>
                  <span className="font-medium text-green-600">
                     {data.totalBuy.toLocaleString()}₽
                  </span>
               </div>
               <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Total Sell:</span>
                  <span className="font-medium text-red-600">
                     {data.totalSell.toLocaleString()}₽
                  </span>
               </div>
            </div>
         </div>
      );
   }
   return null;
};

const CustomBarShape = (props: BarShapeProps) => {
   const { x = 0, y, width = 0, height, hovered } = props;

   // Slight inset for the foreground so border is visible
   const inset = 0.5;
   const fgX = x + inset;
   const fgWidth = Math.max(0, width - inset * 2);
   const fgY = y;
   const fgHeight = height;

   const [color, setColor] = React.useState("rgba(255, 255, 255, 0.5)");

   React.useEffect(() => {
      const updateColors = () => {
         const isDark = document.documentElement.classList.contains("dark");

         setColor(isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)");
      };

      updateColors();

      // Следим за изменениями темы
      const observer = new MutationObserver(updateColors);
      observer.observe(document.documentElement, {
         attributes: true,
         attributeFilter: ["class"],
      });

      return () => observer.disconnect();
   }, []);
   // Colors — use CSS variables if you like; here we use hard values for clarity
   const bgFill = "rgba(0,0,0,0.04)"; // soft dim background
   const highlightStroke = "hsl(var(--foreground))";

   // Common transition style for smoothness
   const transition =
      "opacity 160ms ease, stroke-width 160ms ease, transform 160ms ease";

   return (
      <g>
         {/* background rect (soft dim) */}
         <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={6}
            ry={6}
            fill={bgFill}
            style={{ transition }}
            opacity={hovered ? 0.85 : 0.6}
            pointerEvents="none"
         />
         {/* main foreground rect */}
         <rect
            x={fgX}
            y={fgY}
            width={fgWidth}
            height={fgHeight}
            rx={6}
            ry={6}
            fill={color}
            style={{
               transition,
               // a tiny lift on hover to give UI feedback (no width/height change!)
               transform: hovered ? "translateY(-2px)" : "translateY(0)",
            }}
         />
         {/* outline (only visible on hover) */}
         <rect
            x={fgX}
            y={fgY}
            width={fgWidth}
            height={fgHeight}
            rx={6}
            ry={6}
            fill="none"
            stroke={highlightStroke}
            strokeWidth={hovered ? 2 : 0}
            style={{ transition }}
            pointerEvents="none"
         />
      </g>
   );
};

export function MonthlyRevenueChart() {
   const { chartData: rawData, monthlySpread } = useChartData();
   const allData = useMemo(
      () => aggregateByMonth(rawData, monthlySpread),
      [rawData, monthlySpread],
   );

   const [viewRange, setViewRange] = useState({ start: 0, end: 0 });
   const containerRef = useRef<HTMLDivElement>(null);

   const navRef = useRef({
      start: 0,
      end: 0,
      isDragging: false,
      lastX: 0,
      deltaAccumulator: 0,
   });

   // 1. Нативный обработчик зума (Wheel)
   useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleNativeWheel = (e: WheelEvent) => {
         // Ключевой момент: блокируем скролл страницы
         e.preventDefault();

         const direction = e.deltaY > 0 ? 1 : -1;
         const { start, end } = navRef.current;
         const dataLen = allData.length;
         if (dataLen === 0) return;

         const currentLen = end - start;
         const zoomStep = Math.max(1, Math.round(currentLen * 0.15));

         let newStart = start;
         let newEnd = end;

         if (direction > 0) {
            // Zoom Out
            newStart = Math.max(0, start - zoomStep);
            newEnd = Math.min(dataLen - 1, end + zoomStep);
         } else {
            // Zoom In
            if (currentLen > 2) {
               newStart = Math.min(end - 2, start + zoomStep);
               newEnd = Math.max(start + 2, end - zoomStep);
            }
         }

         navRef.current.start = newStart;
         navRef.current.end = newEnd;
         setViewRange({ start: newStart, end: newEnd });
      };

      // Регистрация НЕ пассивного обработчика
      container.addEventListener("wheel", handleNativeWheel, {
         passive: false,
      });

      return () => {
         container.removeEventListener("wheel", handleNativeWheel);
      };
   }, [allData]); // Переподписываемся при изменении данных

   // 2. Инициализация диапазона (остается как была)
   useEffect(() => {
      if (allData.length > 0) {
         const initial = { start: 0, end: allData.length - 1 };
         setViewRange(initial);
         navRef.current.start = initial.start;
         navRef.current.end = initial.end;
      }
   }, [allData.length]);

   const visibleData = useMemo(
      () => allData.slice(viewRange.start, viewRange.end + 1),
      [allData, viewRange],
   );

   // 3. PAN: Логика Drag (остается как была)
   const onMouseDown = (e: React.MouseEvent) => {
      navRef.current.isDragging = true;
      navRef.current.lastX = e.clientX;
      navRef.current.deltaAccumulator = 0;
      document.body.style.cursor = "grabbing";
   };

   useEffect(() => {
      const onMouseMove = (e: MouseEvent) => {
         if (!navRef.current.isDragging || !containerRef.current) return;

         const { start, end } = navRef.current;
         const visibleCount = end - start + 1;
         const containerWidth =
            containerRef.current.getBoundingClientRect().width;
         const pixelsPerStep = containerWidth / visibleCount;

         const mouseDeltaX = e.clientX - navRef.current.lastX;
         navRef.current.lastX = e.clientX;
         navRef.current.deltaAccumulator += mouseDeltaX;

         if (Math.abs(navRef.current.deltaAccumulator) >= pixelsPerStep) {
            const stepsToMove = Math.trunc(
               navRef.current.deltaAccumulator / pixelsPerStep,
            );
            const shift = -stepsToMove;
            const dataLen = allData.length;

            if (start + shift >= 0 && end + shift < dataLen) {
               const finalStart = start + shift;
               const finalEnd = end + shift;
               navRef.current.start = finalStart;
               navRef.current.end = finalEnd;
               navRef.current.deltaAccumulator -= stepsToMove * pixelsPerStep;
               setViewRange({ start: finalStart, end: finalEnd });
            }
         }
      };

      const onMouseUp = () => {
         navRef.current.isDragging = false;
         document.body.style.cursor = "default";
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      return () => {
         window.removeEventListener("mousemove", onMouseMove);
         window.removeEventListener("mouseup", onMouseUp);
      };
   }, [allData.length]);

   return (
      <Card className="select-none overflow-hidden">
         <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>
               Drag 1:1, Wheel zoom (no page scroll)
            </CardDescription>
         </CardHeader>
         <CardContent>
            {/* onWheel больше не нужен в пропсах, он работает через useEffect/ref */}
            <div
               ref={containerRef}
               onMouseDown={onMouseDown}
               className="w-full h-[400px] cursor-grab active:cursor-grabbing touch-none"
            >
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                     data={visibleData}
                     margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                     <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                     />
                     <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        className="text-xs text-muted-foreground"
                     />
                     <YAxis
                        tickLine={false}
                        axisLine={false}
                        className="text-xs text-muted-foreground"
                        tickFormatter={(v) => `₽${(v / 1000).toFixed(0)}k`}
                     />
                     <Tooltip
                        content={<CustomTooltip active={false} payload={[]} />}
                        cursor={false}
                     />
                     <Bar
                        dataKey="revenue"
                        shape={<CustomBarShape hovered={false} />}
                        isAnimationActive={false}
                     >
                        {visibleData.map((_, index) => (
                           <Cell
                              key={`cell-${index}`}
                              fill="hsl(var(--chart-1))"
                           />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </CardContent>
      </Card>
   );
}