"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";

// --- Types ---

type TimeMode = "day" | "month";

// Полное соответствие колонкам в Supabase
interface ApiCardData {
   id: string;
   bank: "sber" | "tbank" | string;
   balance: number;
   // Ежедневные метрики (сбрасываются cron '0 0 * * *')
   turnover: number;
   operations: number;
   // Ежемесячные метрики (сбрасываются cron '0 0 1 * *')
   monthly_operations: number;
   monthly_turnover: number;
}

type DisplayCardData = {
   id: string;
   bankLabel: string;
   color: string;
   currentTurnover: number;
   maxTurnover: number;
   operations: number;
   maxOperations: number;
};

// --- Config (Без изменений) ---

const LIMITS = {
   day: {
      maxTurnover: 100000,
      maxOperations: 10,
   },
   month: {
      maxTurnover: 1000000,
      maxOperations: 50,
   },
};

const BANK_COLORS: Record<string, string> = {
   sber: "#21A038",
   tbank: "#FFDD2D",
   default: "#888888",
};

// --- Components (Progress bars без изменений) ---
// ... (CircularProgress и LinearProgress оставить как были) ...

const CircularProgress = ({
   percentage,
   color,
   size = 120,
}: {
   percentage: number;
   color: string;
   size?: number;
}) => {
   const strokeWidth = 8;
   const radius = (size - strokeWidth) / 2;
   const circumference = 2 * Math.PI * radius;
   const safePercentage = Math.min(Math.max(percentage, 0), 100);
   const offset = circumference - (safePercentage / 100) * circumference;

   return (
      <svg width={size} height={size} className="transform -rotate-90">
         <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-black/10 dark:text-white/10"
         />
         <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
         />
      </svg>
   );
};

const LinearProgress = ({
   percentage,
   color,
}: {
   percentage: number;
   color: string;
}) => {
   return (
      <div className="w-full h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
         <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
               width: `${Math.min(percentage, 100)}%`,
               backgroundColor: color,
            }}
         />
      </div>
   );
};

const CardRing = ({ card }: { card: DisplayCardData }) => {
   // Защита от деления на 0
   const turnoverPercentage =
      card.maxTurnover > 0
         ? (card.currentTurnover / card.maxTurnover) * 100
         : 0;

   const operationsPercentage =
      card.maxOperations > 0 ? (card.operations / card.maxOperations) * 100 : 0;

   const formatCurrency = (value: number) => {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
      return value.toString();
   };

   return (
      <div className="flex flex-col items-center gap-3">
         <div className="relative">
            <CircularProgress
               percentage={turnoverPercentage}
               color={card.color}
               size={120}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <div className="text-2xl font-bold">
                  {turnoverPercentage.toFixed(0)}%
               </div>
               <div className="text-xs text-muted-foreground">
                  {formatCurrency(card.currentTurnover)}₽
               </div>
            </div>
         </div>

         <div
            className="text-sm font-semibold text-center truncate w-full px-2"
            title={card.id}
         >
            {card.id}
         </div>

         <div className="w-full space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
               <span>Operations</span>
               <span>
                  {card.operations}/{card.maxOperations}
               </span>
            </div>
            <LinearProgress
               percentage={operationsPercentage}
               color={card.color}
            />
         </div>
      </div>
   );
};

export default function CardUsageRingsChart() {
   const [mode, setMode] = useState<TimeMode>("day");
   const [apiData, setApiData] = useState<ApiCardData[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      const fetchData = async () => {
         try {
            setIsLoading(true);
            // Добавлен timestamp чтобы избежать кеширования GET запросов Next.js
            const response = await fetch(`/api/cards?t=${Date.now()}`);
            if (!response.ok) throw new Error("Failed to fetch");

            const json = await response.json();
            setApiData(json);
         } catch (err) {
            console.error(err);
            setError("Error loading data");
         } finally {
            setIsLoading(false);
         }
      };

      fetchData();

      // Опционально: можно добавить поллинг данных
      // const interval = setInterval(fetchData, 5000);
      // return () => clearInterval(interval);
   }, []);

   const processedData: DisplayCardData[] = useMemo(() => {
      const currentLimits = LIMITS[mode];
      const isMonth = mode === "month";

      return apiData.map((item) => {
         // Выбор полей в зависимости от режима
         const turnoverValue = isMonth ? item.monthly_turnover : item.turnover;
         const operationsValue = isMonth
            ? item.monthly_operations
            : item.operations;

         return {
            id: item.id,
            bankLabel: item.bank,
            color: BANK_COLORS[item.bank] || BANK_COLORS.default,

            // Маппинг правильных полей
            currentTurnover: turnoverValue || 0, // Fallback на 0 если null
            operations: operationsValue || 0,

            maxTurnover: currentLimits.maxTurnover,
            maxOperations: currentLimits.maxOperations,
         };
      });
   }, [apiData, mode]);

   if (error) return <div className="p-4 text-red-500">{error}</div>;

   return (
      <Card>
         <CardHeader>
            <div className="flex items-center justify-between">
               <div>
                  <CardTitle>Card Usage</CardTitle>
                  <CardDescription>
                     Turnover and operations per card ({mode})
                  </CardDescription>
               </div>
               <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  {/* Кнопки переключения режимов */}
                  {(["day", "month"] as TimeMode[]).map((m) => (
                     <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                           mode === m
                              ? "bg-background shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                        }`}
                     >
                        {m}
                     </button>
                  ))}
               </div>
            </div>
         </CardHeader>
         <CardContent>
            {isLoading ? (
               <div className="flex items-center justify-center h-48">
                  <span className="text-muted-foreground">
                     Loading cards...
                  </span>
               </div>
            ) : (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {processedData.map((card) => (
                     <CardRing key={card.id} card={card} />
                  ))}
               </div>
            )}
         </CardContent>
      </Card>
   );
}
