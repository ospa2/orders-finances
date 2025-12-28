"use client";

import React, { useState } from "react";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";

type TimeMode = "day" | "month";

type CardData = {
   id: string;
   bank: string;
   color: string;
   currentTurnover: number;
   maxTurnover: number;
   operations: number;
   maxOperations: number;
};

const dummyDataDay: CardData[] = [
   {
      id: "1",
      bank: "Sberbank",
      color: "#21A038",
      currentTurnover: 45000,
      maxTurnover: 100000,
      operations: 12,
      maxOperations: 20,
   },
   {
      id: "2",
      bank: "Tinkoff",
      color: "#FFDD2D",
      currentTurnover: 78000,
      maxTurnover: 100000,
      operations: 18,
      maxOperations: 20,
   },
   {
      id: "3",
      bank: "Alfa",
      color: "#EF3124",
      currentTurnover: 32000,
      maxTurnover: 100000,
      operations: 8,
      maxOperations: 20,
   },
   {
      id: "4",
      bank: "VTB",
      color: "#0098D9",
      currentTurnover: 91000,
      maxTurnover: 100000,
      operations: 19,
      maxOperations: 20,
   },
   {
      id: "5",
      bank: "Raiffeisen",
      color: "#FFED00",
      currentTurnover: 55000,
      maxTurnover: 100000,
      operations: 14,
      maxOperations: 20,
   },
];

const dummyDataMonth: CardData[] = [
   {
      id: "1",
      bank: "Sberbank",
      color: "#21A038",
      currentTurnover: 1250000,
      maxTurnover: 3000000,
      operations: 340,
      maxOperations: 600,
   },
   {
      id: "2",
      bank: "Tinkoff",
      color: "#FFDD2D",
      currentTurnover: 2100000,
      maxTurnover: 3000000,
      operations: 485,
      maxOperations: 600,
   },
   {
      id: "3",
      bank: "Alfa",
      color: "#EF3124",
      currentTurnover: 890000,
      maxTurnover: 3000000,
      operations: 225,
      maxOperations: 600,
   },
   {
      id: "4",
      bank: "VTB",
      color: "#0098D9",
      currentTurnover: 2650000,
      maxTurnover: 3000000,
      operations: 550,
      maxOperations: 600,
   },
   {
      id: "5",
      bank: "Raiffeisen",
      color: "#FFED00",
      currentTurnover: 1580000,
      maxTurnover: 3000000,
      operations: 390,
      maxOperations: 600,
   },
];

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
   const offset = circumference - (percentage / 100) * circumference;

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
            style={{
               transition: "stroke-dashoffset 0.5s ease",
            }}
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
               width: `${percentage}%`,
               backgroundColor: color,
            }}
         />
      </div>
   );
};

const CardRing = ({ card }: { card: CardData; mode: TimeMode }) => {
   const turnoverPercentage = (card.currentTurnover / card.maxTurnover) * 100;
   const operationsPercentage = (card.operations / card.maxOperations) * 100;

   const formatCurrency = (value: number) => {
      if (value >= 1000000) {
         return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
         return `${(value / 1000).toFixed(0)}k`;
      }
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
         <div className="text-sm font-semibold text-center">{card.bank}</div>
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
   const data = mode === "day" ? dummyDataDay : dummyDataMonth;

   return (
      <Card>
         <CardHeader>
            <div className="flex items-center justify-between">
               <div>
                  <CardTitle>Card Usage</CardTitle>
                  <CardDescription>
                     Turnover and operations per card
                  </CardDescription>
               </div>
               <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <button
                     onClick={() => setMode("day")}
                     className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        mode === "day"
                           ? "bg-background shadow-sm"
                           : "text-muted-foreground hover:text-foreground"
                     }`}
                  >
                     Day
                  </button>
                  <button
                     onClick={() => setMode("month")}
                     className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        mode === "month"
                           ? "bg-background shadow-sm"
                           : "text-muted-foreground hover:text-foreground"
                     }`}
                  >
                     Month
                  </button>
               </div>
            </div>
         </CardHeader>
         <CardContent>
            <div className="grid grid-cols-5 gap-6">
               {data.map((card) => (
                  <CardRing key={card.id} card={card} mode={mode} />
               ))}
            </div>
         </CardContent>
      </Card>
   );
}
