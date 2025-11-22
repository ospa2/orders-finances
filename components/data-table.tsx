"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle,
  MoreVertical,
  GripVertical,
  Columns,
  Loader,
  Plus,
} from "lucide-react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { z } from "zod"

// Mock data for demonstration
const mockData = [
  {
    "Order No.": 1964321433965019100,
    "Type": "BUY",
    "Fiat Amount": 24960,
    "Price": 80.9,
    "Coin Amount": 308.529,
    "Counterparty": "IID555",
    "Status": "Completed",
    "Time": "2025-09-06 13:35:00"
  },
  {
    "Order No.": 1963963234391781400,
    "Type": "SELL",
    "Fiat Amount": 10700,
    "Price": 84,
    "Coin Amount": 127.381,
    "Counterparty": "ZolotayaScaha",
    "Status": "Completed",
    "Time": "2025-09-05 13:51:39"
  },
  {
    "Order No.": 1963957611779334100,
    "Type": "SELL",
    "Fiat Amount": 35000,
    "Price": 83.2,
    "Coin Amount": 420.6731,
    "Counterparty": "Mansur S",
    "Status": "Completed",
    "Time": "2025-09-05 13:29:18"
  }
]

export const schema = z.object({
  "Order No.": z.number(),
  "Type": z.string(),
  "Fiat Amount": z.number(),
  "Price": z.number(),
  "Coin Amount": z.number(),
  "Counterparty": z.string(),
  "Status": z.string(),
  "Time": z.string(),
})



export function DataTable({
   data: initialData = mockData,
}: {
   data?: z.infer<typeof schema>[];
}) {
   const [data, setData] = React.useState(() => initialData);
   const [rowSelection, setRowSelection] = React.useState({});
   const [columnVisibility, setColumnVisibility] =
      React.useState<VisibilityState>({});
   const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
      []
   );
   const [sorting, setSorting] = React.useState<SortingState>([]);
   const [pagination, setPagination] = React.useState({
      pageIndex: 0,
      pageSize: 10,
   });
   const [activeTab, setActiveTab] = React.useState("trading-orders");
   const sortableId = React.useId();
   const sensors = useSensors(
      useSensor(MouseSensor, {}),
      useSensor(TouchSensor, {}),
      useSensor(KeyboardSensor, {})
   );

   const dataIds = React.useMemo<UniqueIdentifier[]>(
      () => data?.map(({ "Order No.": orderNo }) => orderNo) || [],
      [data]
   );

   const table = useReactTable({
      data,
      columns,
      state: {
         sorting,
         columnVisibility,
         rowSelection,
         columnFilters,
         pagination,
      },
      getRowId: (row) => row["Order No."].toString(),
      enableRowSelection: true,
      onRowSelectionChange: setRowSelection,
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onColumnVisibilityChange: setColumnVisibility,
      onPaginationChange: setPagination,
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFacetedRowModel: getFacetedRowModel(),
      getFacetedUniqueValues: getFacetedUniqueValues(),
   });

   function handleDragEnd(event: DragEndEvent) {
      const { active, over } = event;
      if (active && over && active.id !== over.id) {
         setData((data) => {
            const oldIndex = dataIds.indexOf(active.id);
            const newIndex = dataIds.indexOf(over.id);
            return arrayMove(data, oldIndex, newIndex);
         });
      }
   }

   return (
      // Use shadcn UI token classes (e.g. bg-background, text-foreground, border-border, bg-muted, etc.)
      // These classes are theme-aware and will render proper dark colors when your app switches to dark mode.
      <div className="w-full bg-background text-foreground">
         {/* Header */}
         <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex space-x-4">
               <button
                  onClick={() => setActiveTab("trading-orders")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                     activeTab === "trading-orders"
                        ? "bg-accent/10 text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                  }`}
               >
                  Trading Orders
               </button>
               <button
                  onClick={() => setActiveTab("analytics")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                     activeTab === "analytics"
                        ? "bg-accent/10 text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                  }`}
               >
                  Analytics{" "}
                  <span className="ml-1 px-2 py-1 text-xs bg-muted rounded-full text-muted-foreground">
                     3
                  </span>
               </button>
               <button
                  onClick={() => setActiveTab("reports")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                     activeTab === "reports"
                        ? "bg-accent/10 text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                  }`}
               >
                  Reports{" "}
                  <span className="ml-1 px-2 py-1 text-xs bg-muted rounded-full text-muted-foreground">
                     2
                  </span>
               </button>
               <button
                  onClick={() => setActiveTab("export")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                     activeTab === "export"
                        ? "bg-accent/10 text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                  }`}
               >
                  Export
               </button>
            </div>
            <div className="flex items-center space-x-2">
               <button className="flex items-center px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent/5">
                  <Columns className="w-4 h-4 mr-2" />
                  Columns
                  <ChevronDown className="w-4 h-4 ml-2" />
               </button>
               <button className="flex items-center px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Order
               </button>
            </div>
         </div>

         {/* Table Content */}
         {activeTab === "trading-orders" && (
            <div className="p-6">
               <div className="border border-border rounded-lg overflow-hidden">
                  <DndContext
                     collisionDetection={closestCenter}
                     modifiers={[restrictToVerticalAxis]}
                     onDragEnd={handleDragEnd}
                     sensors={sensors}
                     id={sortableId}
                  >
                     <table className="w-full">
                        <thead className="bg-muted">
                           {table.getHeaderGroups().map((headerGroup) => (
                              <tr key={headerGroup.id}>
                                 {headerGroup.headers.map((header) => (
                                    <th
                                       key={header.id}
                                       className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                                    >
                                       {header.isPlaceholder
                                          ? null
                                          : flexRender(
                                               header.column.columnDef.header,
                                               header.getContext()
                                            )}
                                    </th>
                                 ))}
                              </tr>
                           ))}
                        </thead>
                        <tbody className="bg-background divide-y divide-border">
                           {table.getRowModel().rows?.length ? (
                              <SortableContext
                                 items={dataIds}
                                 strategy={verticalListSortingStrategy}
                              >
                                 {table.getRowModel().rows.map((row) => (
                                    <DraggableRow key={row.id} row={row} />
                                 ))}
                              </SortableContext>
                           ) : (
                              <tr>
                                 <td
                                    colSpan={columns.length}
                                    className="px-4 py-8 text-center text-muted-foreground"
                                 >
                                    No results.
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </DndContext>
               </div>

               {/* Pagination */}
               <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                     {table.getFilteredSelectedRowModel().rows.length} of{" "}
                     {table.getFilteredRowModel().rows.length} row(s) selected.
                  </div>
                  <div className="flex items-center space-x-2">
                     <span className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                     </span>
                     <button
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="p-2 border border-border rounded hover:bg-accent/5 disabled:opacity-50"
                     >
                        <ChevronsLeft className="h-4 w-4" />
                     </button>
                     <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="p-2 border border-border rounded hover:bg-accent/5 disabled:opacity-50"
                     >
                        <ChevronLeft className="h-4 w-4" />
                     </button>
                     <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="p-2 border border-border rounded hover:bg-accent/5 disabled:opacity-50"
                     >
                        <ChevronRight className="h-4 w-4" />
                     </button>
                     <button
                        onClick={() =>
                           table.setPageIndex(table.getPageCount() - 1)
                        }
                        disabled={!table.getCanNextPage()}
                        className="p-2 border border-border rounded hover:bg-accent/5 disabled:opacity-50"
                     >
                        <ChevronsRight className="h-4 w-4" />
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Other tabs */}
         {activeTab !== "trading-orders" && (
            <div className="p-6">
               <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-lg">
                  <div className="text-center">
                     <h3 className="text-lg font-medium text-foreground mb-2">
                        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}{" "}
                        View
                     </h3>
                     <p className="text-muted-foreground">
                        Content for {activeTab} tab goes here
                     </p>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}

export function DragHandle({ orderNo }: { orderNo: number }) {
   const { attributes, listeners } = useSortable({
      id: orderNo,
   });

   return (
      <button
         {...attributes}
         {...listeners}
         className="text-muted-foreground hover:text-foreground p-1 cursor-grab active:cursor-grabbing"
      >
         <GripVertical className="h-4 w-4" />
         <span className="sr-only">Drag to reorder</span>
      </button>
   );
}

export const columns: ColumnDef<z.infer<typeof schema>>[] = [
   {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle orderNo={row.original["Order No."]} />,
      size: 40,
   },
   {
      id: "select",
      header: ({ table }) => (
         <div className="flex items-center justify-center">
            <input
               type="checkbox"
               checked={table.getIsAllPageRowsSelected()}
               onChange={(e) =>
                  table.toggleAllPageRowsSelected(e.target.checked)
               }
               className="rounded border border-border text-muted-foreground"
            />
         </div>
      ),
      cell: ({ row }) => (
         <div className="flex items-center justify-center">
            <input
               type="checkbox"
               checked={row.getIsSelected()}
               onChange={(e) => row.toggleSelected(e.target.checked)}
               className="rounded border border-border text-muted-foreground"
            />
         </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
   },
   {
      accessorKey: "Order No.",
      header: "Order No.",
      cell: ({ row }) => {
         return <TableCellViewer item={row.original} />;
      },
      enableHiding: false,
   },
   {
      accessorKey: "Type",
      header: "Type",
      cell: ({ row }) => {
         const type = row.original.Type;

         const classes =
            type === "BUY"
               ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900 border-green-300 dark:border-green-700"
               : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900 border-red-300 dark:border-red-700";

         return (
            <div className="w-16">
               <span
                  className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md border ${classes}`}
               >
                  {type}
               </span>
            </div>
         );
      },
   },
   {
      accessorKey: "Status",
      header: "Status",
      cell: ({ row }) => (
         <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border bg-muted text-muted-foreground">
            {row.original.Status === "Completed" ? (
               <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
            ) : (
               <Loader className="w-3 h-3 mr-1 animate-spin" />
            )}
            {row.original.Status}
         </span>
      ),
   },
   {
      accessorKey: "Fiat Amount",
      header: () => <div className="text-right">Fiat Amount</div>,
      cell: ({ row }) => (
         <div className="text-right font-mono">
            {row.original["Fiat Amount"].toLocaleString()}
         </div>
      ),
   },
   {
      accessorKey: "Price",
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => (
         <div className="text-right font-mono">
            {row.original.Price.toFixed(2)}
         </div>
      ),
   },
   {
      accessorKey: "Coin Amount",
      header: () => <div className="text-right">Coin Amount</div>,
      cell: ({ row }) => (
         <div className="text-right font-mono">
            {row.original["Coin Amount"].toFixed(6)}
         </div>
      ),
   },
   {
      accessorKey: "Counterparty",
      header: "Counterparty",
      cell: ({ row }) => (
         <div className="font-medium text-foreground">
            {row.original.Counterparty}
         </div>
      ),
   },
   {
      accessorKey: "Time",
      header: "Time",
      cell: ({ row }) => (
         <div className="text-sm text-muted-foreground">
            {new Date(row.original.Time).toLocaleString()}
         </div>
      ),
   },
   {
      id: "actions",
      cell: () => (
         <div className="relative">
            <button className="p-1 rounded hover:bg-accent/5">
               <MoreVertical className="h-4 w-4" />
               <span className="sr-only">Open menu</span>
            </button>
         </div>
      ),
      size: 40,
   },
];

export function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
   const { transform, transition, setNodeRef, isDragging } = useSortable({
      id: row.original["Order No."],
   });

   return (
      <tr
         ref={setNodeRef}
         className={`border-b hover:bg-muted ${
            isDragging ? "opacity-50" : ""
         } ${row.getIsSelected() ? "bg-accent/10" : ""}`}
         style={{
            transform: CSS.Transform.toString(transform),
            transition: transition,
         }}
      >
         {row.getVisibleCells().map((cell) => (
            <td key={cell.id} className="px-4 py-3">
               {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
         ))}
      </tr>
   );
}






function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
   const [isOpen, setIsOpen] = React.useState(false);

   return (
      <>
         <button
            onClick={() => setIsOpen(true)}
            className="text-neutral-900 dark:text-neutral-100 hover:text-neutral-700 dark:hover:text-neutral-200 font-mono text-left underline"
         >
            {item["Order No."]}
         </button>

         {isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
               <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                     <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Order #{item["Order No."]}
                     </h2>
                     <p className="text-gray-600 dark:text-gray-400">
                        {item.Type} order - {item.Status}
                     </p>
                  </div>

                  <div className="p-6 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Order Number
                           </label>
                           <input
                              type="text"
                              value={item["Order No."]}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Type
                           </label>
                           <select
                              defaultValue={item.Type}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                           >
                              <option value="BUY">BUY</option>
                              <option value="SELL">SELL</option>
                           </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Fiat Amount
                           </label>
                           <input
                              type="number"
                              defaultValue={item["Fiat Amount"]}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Price
                           </label>
                           <input
                              type="number"
                              defaultValue={item.Price}
                              step="0.01"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Coin Amount
                           </label>
                           <input
                              type="number"
                              defaultValue={item["Coin Amount"]}
                              step="0.000001"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Counterparty
                           </label>
                           <input
                              type="text"
                              defaultValue={item.Counterparty}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                           Status
                        </label>
                        <select
                           defaultValue={item.Status}
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                        >
                           <option value="Completed">Completed</option>
                           <option value="Pending">Pending</option>
                           <option value="Cancelled">Cancelled</option>
                        </select>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                           Time
                        </label>
                        <input
                           type="text"
                           defaultValue={item.Time}
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                        />
                     </div>
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                     <button
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-300"
                     >
                        Close
                     </button>
                     <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
                        Save Changes
                     </button>
                  </div>
               </div>
            </div>
         )}
      </>
   );
}

export default function TradingOrdersTable() {
   return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
         <div className="max-w-7xl mx-auto">
            <div className="mb-6">
               <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Trading Orders
               </h1>
               <p className="text-gray-600 dark:text-gray-400">
                  Manage and track your cryptocurrency trading orders
               </p>
            </div>
            <DataTable data={mockData} />
         </div>
      </div>
   );
}