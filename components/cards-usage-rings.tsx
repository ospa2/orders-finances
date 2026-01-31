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

interface ApiCardData {
   id: string;
   bank: "sber" | "tbank" | string;
   balance: number;
   turnover: number;
   operations: number;
   monthly_operations: number;
   monthly_turnover: number;
}

type DisplayCardData = {
   id: string;
   bankLabel: string;
   color: string;
   balance: number;
   currentTurnover: number;
   maxTurnover: number;
   operations: number;
   maxOperations: number;
};

// --- Config ---

const LIMITS = {
   day: { maxTurnover: 100000, maxOperations: 10 },
   month: { maxTurnover: 1000000, maxOperations: 50 },
};

const BANK_COLORS: Record<string, string> = {
   sber: "#21A038",
   tbank: "#FFDD2D",
   default: "#888888",
};

// --- Helpers ---

const formatCurrency = (value: number) => {
   if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
   if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
   return value.toString();
};

const formatFullCurrency = (value: number) => {
   return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
   }).format(value);
};

// --- Components ---

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
      <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
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

// Новый компонент баланса
const BalanceIndicator = ({
   balance,
   maxSetBalance,
   color,
}: {
   balance: number;
   maxSetBalance: number;
   color: string;
}) => {
   // Вычисляем процент заполнения относительно самой богатой карты в наборе
   // Используем Math.max(1, ...) для избежания деления на 0
   const fillPercentage = (balance / Math.max(maxSetBalance, 1)) * 100;

   return (
      <div className="w-full mt-2 group relative overflow-hidden rounded-lg border border-black/5 dark:border-white/5 shadow-sm">
         {/* Background Fill Bar */}
         <div
            className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
            style={{
               width: `${fillPercentage}%`,
               backgroundColor: color,
            }}
         />

         {/* Content */}
         <div className="relative flex items-center justify-between px-3 py-2">
            <div className="flex items-center">
               {/* Добавлен flex и items-center для выравнивания иконки и текста в строку */}
               <span className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-foreground text-background text-[10px] font-bold tracking-wider transition-colors">
                  <svg
                     xmlns="http://www.w3.org/2000/svg"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor" // Используем currentColor, чтобы цвет подстраивался под text-background
                     strokeWidth="2.5"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     className="w-3 h-3"
                  >
                     <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                     <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                  </svg>
                  Balance
               </span>
            </div>

            <div
               className="text-sm font-bold tracking-tight"
               style={{ color: "var(--foreground)" }}
            >
               {formatFullCurrency(balance)}
            </div>
         </div>
      </div>
   );
};

const CardRing = ({
   card,
   maxSetBalance,
}: {
   card: DisplayCardData;
   maxSetBalance: number;
}) => {
   const turnoverPercentage =
      card.maxTurnover > 0
         ? (card.currentTurnover / card.maxTurnover) * 100
         : 0;

   const operationsPercentage =
      card.maxOperations > 0 ? (card.operations / card.maxOperations) * 100 : 0;

   return (
      <div className="flex flex-col items-center gap-4 p-2">
         {/* 1. График оборота */}
         <div className="relative">
            <CircularProgress
               percentage={turnoverPercentage}
               color={card.color}
               size={110} // Чуть уменьшил, чтобы влез новый баланс
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

         {/* 2. Название карты */}
         <div
            className="text-sm font-bold tracking-wide truncate px-2 text-center"
            style={{ color: card.color }}
            title={card.id}
         >
            {card.id}
         </div>

         {/* 3. Новый дизайн баланса */}
         <BalanceIndicator
            balance={card.balance}
            maxSetBalance={maxSetBalance}
            color={card.color}
         />

         {/* 4. Операции */}
         <div className="w-full space-y-1.5 mt-1">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground tracking-wider">
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
   }, []);

   const processedData: DisplayCardData[] = useMemo(() => {
      const currentLimits = LIMITS[mode];
      const isMonth = mode === "month";

      return apiData.map((item) => {
         const turnoverValue = isMonth ? item.monthly_turnover : item.turnover;
         const operationsValue = isMonth
            ? item.monthly_operations
            : item.operations;

         return {
            id: item.id,
            bankLabel: item.bank,
            color: BANK_COLORS[item.bank] || BANK_COLORS.default,
            balance: item.balance || 0,
            currentTurnover: turnoverValue || 0,
            operations: operationsValue || 0,
            maxTurnover: currentLimits.maxTurnover,
            maxOperations: currentLimits.maxOperations,
         };
      });
   }, [apiData, mode]);

   // Вычисляем глобальный максимум баланса для масштабирования шкал
   const maxSetBalance = useMemo(() => {
      if (processedData.length === 0) return 0;
      return Math.max(...processedData.map((c) => c.balance));
   }, [processedData]);

   if (error) return <div className="p-4 text-red-500">{error}</div>;

   return (
      <Card className="w-full">
         <CardHeader>
            <div className="flex items-center justify-between">
               <div>
                  <CardTitle>Financial Overview</CardTitle>
                  <CardDescription>
                     Monitor turnover, operations, and liquidity ({mode})
                  </CardDescription>
               </div>
               <div className="flex gap-1 p-1 bg-muted/50 rounded-lg border border-black/5">
                  {(["day", "month"] as TimeMode[]).map((m) => (
                     <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                           mode === m
                              ? "bg-background shadow-sm text-foreground ring-1 ring-black/5"
                              : "text-muted-foreground hover:text-foreground hover:bg-black/5"
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
               <div className="flex items-center justify-center h-64">
                  <div className="animate-pulse text-muted-foreground font-medium">
                     Syncing bank data...
                  </div>
               </div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                  {processedData.map((card) => (
                     <CardRing
                        key={card.id}
                        card={card}
                        maxSetBalance={maxSetBalance}
                     />
                  ))}
               </div>
            )}
         </CardContent>
      </Card>
   );
}
