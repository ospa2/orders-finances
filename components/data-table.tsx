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

// Create a separate component for the drag handle
function DragHandle({ orderNo }: { orderNo: number }) {
  const { attributes, listeners } = useSortable({
    id: orderNo,
  })

  return (
    <button
      {...attributes}
      {...listeners}
      className="text-gray-400 hover:text-gray-600 p-1 cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" />
      <span className="sr-only">Drag to reorder</span>
    </button>
  )
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
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
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
          className="rounded border border-gray-300"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
          className="rounded border border-gray-300"
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
      return <TableCellViewer item={row.original} />
    },
    enableHiding: false,
  },
  {
    accessorKey: "Type",
    header: "Type",
    cell: ({ row }) => (
      <div className="w-16">
        <span 
          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${
            row.original.Type === "BUY" 
              ? "text-green-700 bg-green-50 border-green-200" 
              : "text-red-700 bg-red-50 border-red-200"
          }`}
        >
          {row.original.Type}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "Status",
    header: "Status",
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border text-gray-700 bg-gray-50 border-gray-200">
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
      <div className="font-medium">
        {row.original.Counterparty}
      </div>
    ),
  },
  {
    accessorKey: "Time",
    header: "Time",
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">
        {new Date(row.original.Time).toLocaleString()}
      </div>
    ),
  },
  {
    id: "actions",
    cell: () => (
      <div className="relative">
        <button className="p-1 hover:bg-gray-100 rounded">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </button>
      </div>
    ),
    size: 40,
  },
]

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original["Order No."],
  })

  return (
    <tr
      ref={setNodeRef}
      className={`border-b hover:bg-gray-50 ${isDragging ? 'opacity-50' : ''} ${row.getIsSelected() ? 'bg-blue-50' : ''}`}
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
  )
}

export function DataTable({
  data: initialData = mockData,
}: {
  data?: z.infer<typeof schema>[]
}) {
  const [data, setData] = React.useState(() => initialData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [activeTab, setActiveTab] = React.useState("trading-orders")
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ "Order No.": orderNo }) => orderNo) || [],
    [data]
  )

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
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="w-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex space-x-4">
          <button 
            onClick={() => setActiveTab("trading-orders")}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === "trading-orders" 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Trading Orders
          </button>
          <button 
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === "analytics" 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Analytics <span className="ml-1 px-2 py-1 text-xs bg-gray-200 rounded-full">3</span>
          </button>
          <button 
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === "reports" 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Reports <span className="ml-1 px-2 py-1 text-xs bg-gray-200 rounded-full">2</span>
          </button>
          <button 
            onClick={() => setActiveTab("export")}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === "export" 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Export
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Columns className="w-4 h-4 mr-2" />
            Columns
            <ChevronDown className="w-4 h-4 ml-2" />
          </button>
          <button className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Order
          </button>
        </div>
      </div>

      {/* Table Content */}
      {activeTab === "trading-orders" && (
        <div className="p-6">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <DndContext
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              sensors={sensors}
              id={sortableId}
            >
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                <tbody>
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
                        className="px-4 py-8 text-center text-gray-500"
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
            <div className="text-sm text-gray-700">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
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
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} View
              </h3>
              <p className="text-gray-500">Content for {activeTab} tab goes here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-blue-600 hover:text-blue-800 font-mono text-left underline"
      >
        {item["Order No."]}
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Order #{item["Order No."]}</h2>
              <p className="text-gray-600">{item.Type} order - {item.Status}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Number
                  </label>
                  <input
                    type="text"
                    value={item["Order No."]}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select 
                    defaultValue={item.Type}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fiat Amount
                  </label>
                  <input
                    type="number"
                    defaultValue={item["Fiat Amount"]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    defaultValue={item.Price}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coin Amount
                  </label>
                  <input
                    type="number"
                    defaultValue={item["Coin Amount"]}
                    step="0.000001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Counterparty
                  </label>
                  <input
                    type="text"
                    defaultValue={item.Counterparty}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select 
                  defaultValue={item.Status}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="text"
                  defaultValue={item.Time}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function TradingOrdersTable() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Trading Orders</h1>
          <p className="text-gray-600">Manage and track your cryptocurrency trading orders</p>
        </div>
        <DataTable data={mockData} />
      </div>
    </div>
  )
}