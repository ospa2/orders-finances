'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChartPoint } from './pnl';



// 1. Создаем сам Контекст
// Устанавливаем значение по умолчанию, которое будет использоваться, 
// если компонент вызван вне провайдера.
interface ChartContextType {
  chartData: ChartPoint[];
  isLoading: boolean;
  
  // Добавляем состояние диапазона времени
  timeRange: TimeRangeValue;
  // Добавляем функцию для обновления состояния диапазона времени
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRangeValue>>;
}

const ChartContext = createContext<ChartContextType | undefined>(undefined);
export type TimeRangeValue = "90d" | "30d" | "7d";

// 2. Создаем Провайдер, который будет управлять состоянием и загрузкой
export const ChartDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = React.useState<TimeRangeValue>("90d");

  // Логика загрузки данных (ваш код, перенесенный сюда)
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/chart-data");
        const raw: ChartPoint[] = await res.json(); // Указываем тип
        
        setChartData(raw);
      } catch (err) {
        console.error("Failed to fetch chart data", err);
      } finally {
        setIsLoading(false); // Загрузка завершена
      }
    }
    load();
  }, []);

  // 3. Значение, которое будет доступно всем потребителям
  const contextValue = {
    chartData,
    isLoading,
    timeRange,
    setTimeRange,
  };

  return (
    <ChartContext.Provider value={contextValue}>
      {children}
    </ChartContext.Provider>
  );
};

// В файле ChartDataProvider.tsx или отдельном hooks.ts

// 4. Создаем хук для удобного использования данных
export const useChartData = () => {
  const context = useContext(ChartContext);
  
  // Проверка на случай, если хук вызван вне провайдера
  if (context === undefined) {
    throw new Error('useChartData must be used within a ChartDataProvider');
  }
  
  return context;
};