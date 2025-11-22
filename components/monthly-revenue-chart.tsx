"use client";

import React, { useState, useCallback } from "react";
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
import { ChartPoint } from "@/lib/pnl";
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
   options = { weighted: true }
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
      number,
      {
         revenue: number;
         totalBuy: number;
         totalSell: number;
         count: number;
         sumOfRowSpreads: number; // используется при weighted = false
         rowsWithBuy: number;
      }
   >();

   for (const { date, buy, sell, revenue } of data) {
      const d = new Date(date);
      if (isNaN(d.getTime())) continue; // пропустить некорректные даты
      const m = d.getMonth();
      const acc = map.get(m) ?? {
         revenue: 0,
         totalBuy: 0,
         totalSell: 0,
         count: 0,
         sumOfRowSpreads: 0,
         rowsWithBuy: 0,
      };
      acc.revenue += revenue;
      acc.totalBuy += buy;
      acc.totalSell += sell;
      acc.count += 1;
      if (buy !== 0) {
         acc.sumOfRowSpreads += (sell - buy) / buy;
         acc.rowsWithBuy += 1;
      }
      map.set(m, acc);
   }

   const result: MonthSummary[] = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0]) // по порядку месяцев
      .map(([monthIndex, acc]) => {
         const { revenue, totalBuy, totalSell, sumOfRowSpreads, rowsWithBuy } =
            acc;
         let avgSpread = 0;
         if (options.weighted) {
            avgSpread = totalBuy > 0 ? (totalSell - totalBuy) / totalBuy : 0;
         } else {
            avgSpread = rowsWithBuy > 0 ? sumOfRowSpreads / rowsWithBuy : 0;
         }
         // округлим до 2 знаков, вернём число (не строку)
         avgSpread = Number(avgSpread.toFixed(2));
         return {
            month: monthNames[monthIndex],
            revenue,
            avgSpread,
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
   const { x=0, y, width=0, height, hovered } = props;

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

  const data = useChartData().chartData
  const revenueData = aggregateByMonth(data)
   const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

   const handleMouseEnter = useCallback(
      (_: React.MouseEvent, index: number) => {
         setHoveredIndex(index);
      },
      []
   );

   const handleMouseLeave = useCallback(() => {
      setHoveredIndex(null);
   }, []);

   return (
      <Card>
         <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Revenue breakdown for the year</CardDescription>
         </CardHeader>
         <CardContent>
            <ResponsiveContainer width="100%" height={400}>
               <BarChart
                  data={revenueData}
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
                     className="text-muted-foreground"
                  />
                  <YAxis
                     tickLine={false}
                     axisLine={false}
                     className="text-muted-foreground"
                     tickFormatter={(value) => `₽${(value / 1000).toFixed(0)}k`}
                  />
                  {/* disable the default cursor so it doesn't create weird overlay - we'll keep tooltip */}
                  <Tooltip content={<CustomTooltip active={false} payload={[]} />} cursor={false} />
                  <Bar
                     dataKey="revenue"
                     // use custom shape renderer and we will render Cells to get index-based hover handlers
                     shape={<CustomBarShape hovered={false}  />}
                     isAnimationActive={false} // disable initial animation to avoid re-layout jumps
                  >
                     {revenueData.map((entry, index) => (
                        <Cell
                           key={`cell-${index}`}
                           onMouseEnter={(e: React.MouseEvent) =>
                              handleMouseEnter(e, index)
                           }
                           onMouseLeave={handleMouseLeave}
                           // pass hovered prop via className (Recharts won't pass custom props to shape automatically)
                           // instead we'll render the Bar with a function shape — but simpler: override `shape` prop per Cell
                           // Recharts doesn't support per-Cell shape prop directly, so we provide a `shape` at Bar level and
                           // rely on `payload` to decide hovered state inside shape through props. To make it simpler,
                           // we'll pass `fill` attribute that the shape ignores but keep for compatibility.
                           fill="hsl(var(--chart-1))"
                           // also add role and cursor style
                           style={{ cursor: "pointer" }}
                        />
                     ))}
                  </Bar>
               </BarChart>
            </ResponsiveContainer>
         </CardContent>
      </Card>
   );
}
