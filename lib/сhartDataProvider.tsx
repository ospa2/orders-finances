"use client";
import React, {
   createContext,
   useContext,
   useState,
   useEffect,
   useMemo,
} from "react";
import { ChartPoint, MonthlySpread } from "./pnl";

export type TimeRangeValue = "90d" | "30d" | "7d";

interface ChartContextType {
   chartData: ChartPoint[];
   isLoading: boolean;
   timeRange: TimeRangeValue;
   setTimeRange: React.Dispatch<React.SetStateAction<TimeRangeValue>>;
   monthlySpread: MonthlySpread[];
}

interface CacheSchema {
   chartData: ChartPoint[];
   monthlySpread: MonthlySpread[];
}

const ChartContext = createContext<ChartContextType | undefined>(undefined);

export const ChartDataProvider: React.FC<{ children: React.ReactNode }> = ({
   children,
}) => {
   const [chartData, setChartData] = useState<ChartPoint[]>([]);
   const [monthlySpread, setMonthlySpread] = useState<MonthlySpread[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [timeRange, setTimeRange] = useState<TimeRangeValue>("90d");

   useEffect(() => {
      // Выполняем в useEffect, чтобы избежать ReferenceError: window is not defined при SSR
      const loadFromCache = (): void => {
         try {
            const dataRaw = localStorage.getItem("chart_data_cache");

            if (dataRaw) {
               const parsed = JSON.parse(dataRaw) as CacheSchema;

               // Простейшая валидация структуры
               if (
                  Array.isArray(parsed.chartData) &&
                  Array.isArray(parsed.monthlySpread)
               ) {
                  setChartData(parsed.chartData);
                  setMonthlySpread(parsed.monthlySpread);
               }
            }
         } catch (err) {
            console.error("Critical: Failed to parse chart_data_cache", err);
         } finally {
            setIsLoading(false);
         }
      };

      loadFromCache();
   }, []);

   const fetchData = async (): Promise<void> => {
      try {
         const res = await fetch(`/api/chart-data`);

         if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
         }

         const data: CacheSchema = await res.json();

         // Защита от пустых или некорректных данных из API
         const newChartData = Array.isArray(data?.chartData)
            ? data.chartData
            : [];
         console.log('data:', data);
         console.log('newChartData:', newChartData);
         
         

         // Защита от неопределенного состояния chartData (если это стейт)
         const currentChartData = Array.isArray(chartData) ? chartData : [];

         const mergeByDate = (
            a: ChartPoint[],
            b: ChartPoint[],
         ): ChartPoint[] => {
            const map = new Map<string, ChartPoint>();
            // Теперь a и b гарантированно итерируемы
            for (const item of a) map.set(item.date, item);
            for (const item of b) map.set(item.date, item);
            return Array.from(map.values());
         };

         const allChartData = mergeByDate(currentChartData, newChartData);

         if (allChartData.length > 0) {
            setChartData(allChartData);
            setMonthlySpread(data.monthlySpread);
            localStorage.setItem("chart_data_cache", JSON.stringify(data));
         }
      } catch (error) {
         console.error("Failed to fetch or merge chart data:", error);
      }
   };

   useEffect(() => {
      fetchData();
   }, []);
   const contextValue = useMemo(
      (): ChartContextType => ({
         chartData,
         isLoading,
         timeRange,
         setTimeRange,
         monthlySpread,
      }),
      [chartData, isLoading, timeRange, monthlySpread]
   );

   return (
      <ChartContext.Provider value={contextValue}>
         {children}
      </ChartContext.Provider>
   );
};

export const useChartData = (): ChartContextType => {
   const context = useContext(ChartContext);
   if (!context) {
      throw new Error("useChartData must be used within a ChartDataProvider");
   }
   return context;
};
