"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { useChartData } from "@/hooks/сhartDataProvider";

type MonthSummary = {
   month: string;
   revenue: number;
   projectedRevenue: number; // ожидаемый доход сверх фактического (0 для всех кроме текущего месяца)
   avgSpread: number;
   totalBuy: number;
   totalSell: number;
   isCurrentMonth: boolean;
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

function getDaysInMonth(year: number, month: number): number {
   return new Date(year, month + 1, 0).getDate();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function smoothed(values: number[], window = 4): number[] {
   const half = Math.floor(window / 2);
   return values.map((_, i) => {
      const start = Math.max(0, i - half);
      const end = Math.min(values.length - 1, i + half);
      const slice = values.slice(start, end + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
   });
}

function mean(arr: number[]): number {
   if (arr.length === 0) return 0;
   return arr.reduce((a, b) => a + b, 0) / arr.length;
}

type Segment = {
   // индексы дней внутри прошедшей части месяца (0-based)
   startIdx: number;
   endIdx: number;
   revenues: number[]; // доход по дням
};

/**
 * Разбивает массив дневных доходов на сегменты по двухпроходному алгоритму.
 * Возвращает массив сегментов, отсортированных по startIdx.
 */
function detectSegments(dailyRevenues: number[]): Segment[] {
   const n = dailyRevenues.length;
   if (n === 0) return [];

   const sm = smoothed(dailyRevenues, 4);

   // ── Pass 1: грубые кандидаты на долины ──────────────────────────────────

   const nonZero = dailyRevenues.filter((v) => v > 0);
   const globalMedian =
      nonZero.length === 0
         ? 0
         : nonZero.sort((a, b) => a - b)[Math.floor(nonZero.length / 2)];

   const ROUGH_THRESHOLD = globalMedian * 0.3;

   // Помечаем каждый день: valley = true если кандидат на разделитель
   const isValleyCandidate = sm.map((v) => v < ROUGH_THRESHOLD);

   // Собираем непрерывные серии кандидатов в "runs"
   type Run = { start: number; end: number };
   const valleyRuns: Run[] = [];
   let inRun = false;
   let runStart = 0;

   for (let i = 0; i < n; i++) {
      if (isValleyCandidate[i] && !inRun) {
         inRun = true;
         runStart = i;
      } else if (!isValleyCandidate[i] && inRun) {
         valleyRuns.push({ start: runStart, end: i - 1 });
         inRun = false;
      }
   }
   if (inRun) valleyRuns.push({ start: runStart, end: n - 1 });

   // ── Pass 2: адаптивный контраст ─────────────────────────────────────────

   // Фильтруем: долина должна быть ≥ 2 дней
   const MIN_VALLEY_LEN = 2;
   const confirmedDividers: Run[] = [];

   for (const run of valleyRuns) {
      const len = run.end - run.start + 1;
      if (len < MIN_VALLEY_LEN) continue;

      const valleyLevel = mean(sm.slice(run.start, run.end + 1));

      const leftRevs = sm.slice(0, run.start);
      const rightRevs = sm.slice(run.end + 1);

      if (leftRevs.length === 0 || rightRevs.length === 0) continue;

      const leftLevel = mean(leftRevs);
      const rightLevel = mean(rightRevs);

      const reference = Math.min(leftLevel, rightLevel);
      if (reference <= 0) continue;

      const K = valleyLevel / reference;
      if (K < 0.5) {
         confirmedDividers.push(run);
      }
   }

   // ── Строим сегменты из подтверждённых разделителей ──────────────────────

   const boundaries: number[] = [0];
   for (const d of confirmedDividers) {
      boundaries.push(d.start);
      boundaries.push(d.end + 1);
   }
   boundaries.push(n);

   // boundaries идут парами [start, end)
   const rawSegments: Segment[] = [];
   for (let i = 0; i < boundaries.length - 1; i += 2) {
      const start = boundaries[i];
      const end = boundaries[i + 1] - 1;
      if (start > end) continue;

      // Проверяем — это активный сегмент или долина
      const segRevs = dailyRevenues.slice(start, end + 1);
      const segMean = mean(segRevs);

      // Пропускаем сегменты с уровнем как у долины
      const isDivider = confirmedDividers.some(
         (d) => d.start === start && d.end === end,
      );
      if (isDivider) continue;
      if (globalMedian > 0 && segMean < ROUGH_THRESHOLD) continue;

      rawSegments.push({ startIdx: start, endIdx: end, revenues: segRevs });
   }

   // ── Постобработка: сливаем сегменты < 3 дней с похожим соседом ──────────

   const MIN_SEGMENT_LEN = 3;
   const segments: Segment[] = [];

   for (let i = 0; i < rawSegments.length; i++) {
      const seg = rawSegments[i];
      const len = seg.endIdx - seg.startIdx + 1;

      if (len < MIN_SEGMENT_LEN && segments.length > 0) {
         // Сливаем с предыдущим
         const prev = segments[segments.length - 1];
         prev.endIdx = seg.endIdx;
         prev.revenues = [...prev.revenues, ...seg.revenues];
      } else {
         segments.push({ ...seg, revenues: [...seg.revenues] });
      }
   }

   return segments;
}

/**
 * Считает avgRevenuePerActiveDay и activeRatio для сегмента
 */
type SegmentRate = {
   avgPerActiveDay: number; // средний доход в активный день
   activeRatio: number;     // доля активных дней среди всех дней сегмента
};

function segmentRate(revenues: number[]): SegmentRate {
   const activeDays = revenues.filter((v) => v > 0);
   const activeRatio = revenues.length > 0 ? activeDays.length / revenues.length : 0;
   const avgPerActiveDay = activeDays.length > 0 ? mean(activeDays) : 0;
   return { avgPerActiveDay, activeRatio };
}

// ─── Main function ───────────────────────────────────────────────────────────

function aggregateByMonth(
   data: ChartPoint[],
   monthlySpread: MonthlySpread[],
): MonthSummary[] {
   const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
   ];

   const now = new Date();
   const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
   const currentDayOfMonth = now.getDate();

   const map = new Map<
      string,
      {
         revenue: number;
         totalBuy: number;
         totalSell: number;
         count: number;
         year: number;
         monthIndex: number;
         // дневные доходы для текущего месяца
         dailyRevenues: Map<number, number>; // day-of-month → revenue
      }
   >();

   const spreadMap = new Map<string, number>();
   monthlySpread.forEach((item) => {
      const month = Object.keys(item)[0];
      spreadMap.set(month, item[month]);
   });

   for (const { date, buy, sell, revenue } of data) {
      const d = new Date(date);
      if (isNaN(d.getTime())) continue;

      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const dayOfMonth = d.getDate();

      const acc = map.get(monthKey) ?? {
         revenue: 0,
         totalBuy: 0,
         totalSell: 0,
         count: 0,
         year,
         monthIndex,
         dailyRevenues: new Map<number, number>(),
      };
      acc.revenue += revenue;
      acc.totalBuy += buy;
      acc.totalSell += sell;
      acc.count += 1;
      acc.dailyRevenues.set(
         dayOfMonth,
         (acc.dailyRevenues.get(dayOfMonth) ?? 0) + revenue,
      );
      map.set(monthKey, acc);
   }

   return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, acc]) => {
         const { revenue, totalBuy, totalSell, year, monthIndex, dailyRevenues } = acc;

         const spreadPercent = spreadMap.get(monthKey) || 0;
         const avgSpread = spreadPercent / 100;

         const isCurrentMonth = monthKey === currentYearMonth;

         let projectedRevenue = 0;

         if (isCurrentMonth && currentDayOfMonth > 0) {
            const totalDays = getDaysInMonth(year, monthIndex);
            const remainingDays = totalDays - currentDayOfMonth;

            if (remainingDays > 0) {
               // Строим массив дневных доходов [день 1 .. текущий день]
               const dailyArr: number[] = Array.from(
                  { length: currentDayOfMonth },
                  (_, i) => dailyRevenues.get(i + 1) ?? 0,
               );

               // Детектируем сегменты
               const segments = detectSegments(dailyArr);

               // Текущий сегмент — последний (содержит currentDayOfMonth - 1)
               const lastIdx = currentDayOfMonth - 1;
               const currentSeg =
                  segments.length > 0
                     ? segments.find(
                          (s) => s.startIdx <= lastIdx && s.endIdx >= lastIdx,
                       ) ?? segments[segments.length - 1]
                     : null;

               const MIN_ACTIVE_DAYS = 3;

               const computeProjected = (rate: SegmentRate): number => {
                  return rate.avgPerActiveDay * rate.activeRatio * remainingDays;
               };

               if (currentSeg) {
                  const curRate = segmentRate(currentSeg.revenues);
                  const curActiveDays = currentSeg.revenues.filter(
                     (v) => v > 0,
                  ).length;

                  if (curActiveDays >= MIN_ACTIVE_DAYS) {
                     // Достаточно данных — используем только текущий сегмент
                     projectedRevenue = computeProjected(curRate);
                  } else {
                     // Мало данных — weighted average с предыдущим сегментом
                     const prevSeg =
                        segments.length >= 2
                           ? segments[segments.indexOf(currentSeg) - 1]
                           : null;

                     if (prevSeg) {
                        const prevRate = segmentRate(prevSeg.revenues);
                        const prevActiveDays = prevSeg.revenues.filter(
                           (v) => v > 0,
                        ).length;

                        const totalActive = curActiveDays + prevActiveDays;
                        const wCur = curActiveDays / totalActive;
                        const wPrev = 1 - wCur;

                        const blendedRate: SegmentRate = {
                           avgPerActiveDay:
                              curRate.avgPerActiveDay * wCur +
                              prevRate.avgPerActiveDay * wPrev,
                           activeRatio:
                              curRate.activeRatio * wCur +
                              prevRate.activeRatio * wPrev,
                        };

                        projectedRevenue = computeProjected(blendedRate);
                     } else {
                        // Нет предыдущего — используем что есть
                        projectedRevenue = computeProjected(curRate);
                     }
                  }
               }

               projectedRevenue = Math.max(0, projectedRevenue);
            }
         }

         return {
            month: `${monthNames[monthIndex]} ${monthNames[monthIndex] === "Jan" ? year : ""}`,
            revenue,
            projectedRevenue,
            avgSpread,
            totalBuy,
            totalSell,
            isCurrentMonth,
         };
      });
}

// Tooltip
const CustomTooltip = ({
   active,
   payload,
}: {
   active: boolean;
   payload: TooltipPayload[];
}) => {
   if (active && payload && payload.length) {
      const data = payload[0].payload;
      const projectedTotal = data.revenue + data.projectedRevenue;

      return (
         <div className="rounded-lg border bg-background p-3 shadow-lg">
            <p className="text-sm font-semibold mb-2">{data.month}</p>
            <div className="space-y-1 text-sm">
               <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Revenue:</span>
                  <span className="font-medium">
                     {data.revenue.toLocaleString()}₽
                  </span>
               </div>
               {data.isCurrentMonth && data.projectedRevenue > 0 && (
                  <>
                     <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">
                           Projected:
                        </span>
                        <span className="font-medium text-blue-500">
                           ~{projectedTotal.toLocaleString()}₽
                        </span>
                     </div>
                     <div className="border-t pt-1 mt-1 flex justify-between gap-4 text-xs text-muted-foreground">
                        <span>Expected extra:</span>
                        <span className="text-blue-400">
                           +{data.projectedRevenue.toLocaleString()}₽
                        </span>
                     </div>
                  </>
               )}
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

// Обычный бар (фактический доход)
const CustomBarShape = (props: BarShapeProps) => {
   const { x = 0, y, width = 0, height, hovered } = props;

   const inset = 0.5;
   const fgX = x + inset;
   const fgWidth = Math.max(0, width - inset * 2);

   const [color, setColor] = React.useState("rgba(255, 255, 255, 0.5)");

   React.useEffect(() => {
      const updateColors = () => {
         const isDark = document.documentElement.classList.contains("dark");
         setColor(isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)");
      };
      updateColors();
      const observer = new MutationObserver(updateColors);
      observer.observe(document.documentElement, {
         attributes: true,
         attributeFilter: ["class"],
      });
      return () => observer.disconnect();
   }, []);

   const bgFill = "rgba(0,0,0,0.04)";
   const highlightStroke = "hsl(var(--foreground))";
   const transition =
      "opacity 160ms ease, stroke-width 160ms ease, transform 160ms ease";

   return (
      <g>
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
         <rect
            x={fgX}
            y={y}
            width={fgWidth}
            height={height}
            rx={6}
            ry={6}
            fill={color}
            style={{
               transition,
               transform: hovered ? "translateY(-2px)" : "translateY(0)",
            }}
         />
         <rect
            x={fgX}
            y={y}
            width={fgWidth}
            height={height}
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

// Прозрачный бар сверху (прогноз) — только для текущего месяца
const ProjectedBarShape = (
   props: BarShapeProps & { isCurrentMonth?: boolean },
) => {
   const { x = 0, y = 0, width = 0, height = 0, isCurrentMonth } = props;

   if (!isCurrentMonth || height <= 0) return null;

   const inset = 0.5;
   const fgX = x + inset;
   const fgWidth = Math.max(0, width - inset * 2);

   // Скругляем только верхние углы (т.к. нижние примыкают к основному бару)
   const r = 6;

   return (
      <g>
         {/* Штриховая рамка */}
         <path
            d={`
               M ${fgX + r} ${y}
               H ${fgX + fgWidth - r}
               Q ${fgX + fgWidth} ${y} ${fgX + fgWidth} ${y + r}
               V ${y + height}
               H ${fgX}
               V ${y + r}
               Q ${fgX} ${y} ${fgX + r} ${y}
               Z
            `}
            fill="rgba(99, 179, 237, 0.18)"
            stroke="rgba(99, 179, 237, 0.7)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
         />
         {/* Тихий текст-маркер */}
         <text
            x={fgX + fgWidth / 2}
            y={y + height / 2 + 4}
            textAnchor="middle"
            fontSize={9}
            fill="rgba(99,179,237,0.9)"
            fontWeight={500}
         >
            est.
         </text>
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

   useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleNativeWheel = (e: WheelEvent) => {
         e.preventDefault();
         const direction = e.deltaY > 0 ? 1 : -1;
         const { start, end } = navRef.current;
         const dataLen = allData.length;
         if (dataLen === 0) return;

         const currentLen = end - start;
         const zoomStep = Math.max(1, Math.round(currentLen * 0.15));
         let newStart = start,
            newEnd = end;

         if (direction > 0) {
            newStart = Math.max(0, start - zoomStep);
            newEnd = Math.min(dataLen - 1, end + zoomStep);
         } else {
            if (currentLen > 2) {
               newStart = Math.min(end - 2, start + zoomStep);
               newEnd = Math.max(start + 2, end - zoomStep);
            }
         }

         navRef.current.start = newStart;
         navRef.current.end = newEnd;
         setViewRange({ start: newStart, end: newEnd });
      };

      container.addEventListener("wheel", handleNativeWheel, {
         passive: false,
      });
      return () => container.removeEventListener("wheel", handleNativeWheel);
   }, [allData]);

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
               Drag 1:1, Wheel zoom · Dashed bar = projected for current month
            </CardDescription>
         </CardHeader>
         <CardContent>
            <div
               ref={containerRef}
               onMouseDown={onMouseDown}
               className="w-full h-[400px] cursor-grab active:cursor-grabbing touch-none"
            >
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                     data={visibleData}
                     stackOffset="none"
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

                     {/* Фактический доход */}
                     <Bar
                        dataKey="revenue"
                        stackId="revenue"
                        shape={<CustomBarShape hovered={false} />}
                        isAnimationActive={false}
                     >
                        {visibleData.map((_, index) => (
                           <Cell
                              key={`cell-actual-${index}`}
                              fill="hsl(var(--chart-1))"
                           />
                        ))}
                     </Bar>

                     {/* Прогнозируемый доход — только для текущего месяца, над фактическим */}
                     <Bar
                        dataKey="projectedRevenue"
                        stackId="revenue"
                        shape={(props: unknown) => {
                           const p = props as BarShapeProps & {
                              index?: number;
                           };
                           const entry = visibleData[p.index ?? 0];
                           return (
                              <ProjectedBarShape
                                 {...p}
                                 isCurrentMonth={entry?.isCurrentMonth}
                              />
                           );
                        }}
                        isAnimationActive={false}
                     >
                        {visibleData.map((_, index) => (
                           <Cell
                              key={`cell-proj-${index}`}
                              fill="transparent"
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
