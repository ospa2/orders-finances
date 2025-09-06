import React from "react";
interface Order {
  itemId: string;
  side: "buy" | "sell";
  quantity: number; // $
  amount: number;   // ₽
  curPrice: number; // курс
  device: string;
  receivedAt: number;
}

interface OrderCardProps {
  order: Order;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const date = new Date(order.receivedAt).toLocaleString();

  return (
    <div
      className={`p-4 rounded-2xl shadow-md border ${
        order.side === "buy" ? "border-green-500" : "border-red-500"
      }`}
    >
      <h2
        className={`text-lg font-bold mb-2 ${
          order.side === "buy" ? "text-green-600" : "text-red-600"
        }`}
      >
        {order.side.toUpperCase()}
      </h2>

      <div className="text-sm text-gray-700">
        <p>
          <span className="font-semibold">ID:</span> {order.itemId}
        </p>
        <p>
          <span className="font-semibold">Количество ($):</span> {order.quantity}
        </p>
        <p>
          <span className="font-semibold">Сумма (₽):</span> {order.amount}
        </p>
        <p>
          <span className="font-semibold">Курс:</span> {order.curPrice}
        </p>
        <p>
          <span className="font-semibold">Устройство:</span> {order.device}
        </p>
        <p className="text-xs text-gray-500 mt-1">{date}</p>
      </div>
    </div>
  );
};

export default OrderCard;
