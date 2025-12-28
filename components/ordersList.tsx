"use client";
import React, { useEffect, useState } from "react";
import OrderCard from "./orderCard";

interface Order {
   itemId: string;
   side: "buy" | "sell";
   quantity: number; // $
   amount: number; // ₽
   curPrice: number; // курс
   device: string;
   receivedAt: number;
}

export default function OrdersList() {
   const [orders, setOrders] = useState<Order[]>([]);

   useEffect(() => {
      const fetchOrders = async () => {
         const res = await fetch("/api/orders");
         const data: Order[] = await res.json();
         setOrders(data);
      };
      
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000); // обновляем каждые 5 сек
      return () => clearInterval(interval);
   }, []);

   return (
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
         {orders.map((o, idx) => (
            <OrderCard key={idx} order={o} />
         ))}
      </div>
   );
}
