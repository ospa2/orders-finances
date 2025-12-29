"use client";

import * as React from "react";
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
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
   arrayMove,
   SortableContext,
   useSortable,
   verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
   IconArrowDown,
   IconArrowUp,
   IconChevronDown,
   IconChevronLeft,
   IconChevronRight,
   IconChevronsLeft,
   IconChevronsRight,
   IconCircleCheckFilled,
   IconGripVertical,
   IconLayoutColumns,
   IconLoader,
   IconSelector,
   IconX,
} from "@tabler/icons-react";
import {
   Column,
   flexRender,
   getCoreRowModel,
   getFacetedRowModel,
   getFacetedUniqueValues,
   getFilteredRowModel,
   getPaginationRowModel,
   getSortedRowModel,
   useReactTable,
   type ColumnDef,
   type ColumnFiltersState,
   type Row,
   type SortingState,
   type VisibilityState,
} from "@tanstack/react-table";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { z } from "zod";

import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import {
   Drawer,
   DrawerClose,
   DrawerContent,
   DrawerDescription,
   DrawerFooter,
   DrawerHeader,
   DrawerTitle,
   DrawerTrigger,
} from "@/components/ui/drawer";
import {
   DropdownMenu,
   DropdownMenuCheckboxItem,
   DropdownMenuContent,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Order } from "@/lib/pnl";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export const schema = z.object({
   "Order No.": z.string(),
   Type: z.string(),
   "Fiat Amount": z.coerce.number(),
   Price: z.coerce.number(),
   "Coin Amount": z.coerce.number(),
   Counterparty: z.string(),
   Status: z.string(),
   Time: z.string(), // или z.coerce.date(), если нужен объект Date
});
const STORAGE_KEY = "orders_cache";
// Create a separate component for the drag handle
function DragHandle({ id }: { id: number }) {
   const { attributes, listeners } = useSortable({
      id,
   });

   return (
      <Button
         {...attributes}
         {...listeners}
         variant="ghost"
         size="icon"
         className="text-muted-foreground size-7 hover:bg-transparent"
      >
         <IconGripVertical className="text-muted-foreground size-3" />
         <span className="sr-only">Drag to reorder</span>
      </Button>
   );
}

const columns: ColumnDef<Order>[] = [
   {
      id: "drag",
      header: () => null,
      cell: ({ row }) => (
         <div className="w-8 flex justify-center">
            <DragHandle id={row.original["Order No."]} />
         </div>
      ),
      enableSorting: false,
   },
   {
      id: "select",
      header: ({ table }) => (
         <div className="flex items-center justify-center w-8">
            <Checkbox
               checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() && "indeterminate")
               }
               onCheckedChange={(value) =>
                  table.toggleAllPageRowsSelected(!!value)
               }
               aria-label="Select all"
            />
         </div>
      ),
      cell: ({ row }) => (
         <div className="flex items-center justify-center w-8">
            <Checkbox
               checked={row.getIsSelected()}
               onCheckedChange={(value) => row.toggleSelected(!!value)}
               aria-label="Select row"
            />
         </div>
      ),
      enableSorting: false,
      enableHiding: false,
   },
   {
      accessorKey: "Order No.",
      header: ({ column }) => (
         <DataTableColumnHeader column={column} title="Order No." />
      ),
      cell: ({ row, table }) => {
         // Получаем данные из meta
         type MetaType = {
            allOrders: Order[];
         };
       const allOrders = (table.options.meta as MetaType)?.allOrders || [];
         return <TableCellViewer item={row.original} allOrders={allOrders} />;
      },
   },
   {
      accessorKey: "Type",
      header: ({ column }) => (
         <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => <Badge variant="outline">{row.original.Type}</Badge>,
   },
   {
      accessorKey: "Fiat Amount",
      header: ({ column }) => (
         <DataTableColumnHeader
            column={column}
            title="Fiat Amount"
            className="justify-end"
         />
      ),
      cell: ({ row }) => (
         <div className="text-right">{row.original["Fiat Amount"]}</div>
      ),
   },
   {
      accessorKey: "Price",
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => (
         <div className="text-right font-medium">
            {new Intl.NumberFormat().format(row.original.Price)}
         </div>
      ),
   },
   {
      accessorKey: "Coin Amount",
      header: () => <div className="text-right">Coin Amount</div>,
      cell: ({ row }) => (
         <div className="text-right font-medium">
            {new Intl.NumberFormat().format(row.original["Coin Amount"])}
         </div>
      ),
   },
   {
      accessorKey: "Counterparty",
      header: "Counterparty",
      cell: ({ row }) => (
         <div className="w-40 truncate">{row.original.Counterparty}</div>
      ),
   },
   {
      accessorKey: "Status",
      header: "Status",
      cell: ({ row }) => {
         const status = row.original.Status;
         return (
            <div className="w-32">
               <Badge
                  variant="outline"
                  className="flex w-fit items-center gap-1.5 text-muted-foreground px-1.5 font-normal"
               >
                  {status === "Completed" ? (
                     <IconCircleCheckFilled className="size-3.5 fill-green-500" />
                  ) : (
                     <IconLoader className="size-3.5 animate-spin" />
                  )}
                  {status}
               </Badge>
            </div>
         );
      },
   },
   {
      accessorKey: "Time",
      header: ({ column }) => (
         <DataTableColumnHeader column={column} title="Time" />
      ),
      cell: ({ row }) => {
         const dateObj = new Date(row.original.Time);

         // Проверка на валидность даты
         if (isNaN(dateObj.getTime())) {
            return <div className="text-xs text-destructive">Invalid Date</div>;
         }

         const date = dateObj.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
         });

         const time = dateObj.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
         });

         return (
            <div className="flex flex-col text-xs leading-tight min-w-[80px]">
               <span className="font-medium text-foreground">{date}</span>
               <span className="text-muted-foreground">{time}</span>
            </div>
         );
      },
   },
];

// В файле, где определен DraggableRow (обычно в этом же файле или рядом)
interface DraggableRowProps {
   row: Row<Order>;
   disabled?: boolean; // Добавляем опциональный проп
}

function DraggableRow({ row, disabled }: DraggableRowProps) {
   const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
   } = useSortable({
      id: row.id,
      disabled,
   });

   const style: React.CSSProperties = {
      transform: CSS.Translate.toString(transform), // Используем Translate для таблиц (чтобы не ломать ширину колонок)
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 10 : 1,
      position: "relative",
   };

   return (
      <TableRow
         ref={setNodeRef}
         style={style}
         className={cn(isDragging && "bg-accent/50")}
      >
         {row.getVisibleCells().map((cell) => (
            <TableCell key={cell.id}>
               {/* Передаем контекст через замыкание или meta */}
               {flexRender(cell.column.columnDef.cell, {
                  ...cell.getContext(),
                  // dnd-kit context inject
                  dragProps: { attributes, listeners, disabled },
               })}
            </TableCell>
         ))}
      </TableRow>
   );
}

interface DataTableColumnHeaderProps<TData, TValue>
   extends React.HTMLAttributes<HTMLDivElement> {
   column: Column<TData, TValue>;
   title: string;
}

function DataTableColumnHeader<TData, TValue>({
   column,
   title,
   className,
}: DataTableColumnHeaderProps<TData, TValue>) {
   if (!column.getCanSort()) {
      return <div className={className}>{title}</div>;
   }

   return (
      <div className={cn("flex items-center space-x-2", className)}>
         <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
         >
            <span>{title}</span>
            {column.getIsSorted() === "desc" ? (
               <IconArrowDown className="ml-2 size-4" />
            ) : column.getIsSorted() === "asc" ? (
               <IconArrowUp className="ml-2 size-4" />
            ) : (
               <IconSelector className="ml-2 size-4 text-muted-foreground/50" />
            )}
         </Button>
      </div>
   );
}
export function DataTable() {
   const initialData: Order[] = [
      {
         "Order No.": 2003852963925250048,
         Type: "SELL",
         "Fiat Amount": 59000,
         Price: 84.5,
         "Coin Amount": 698.2249,
         Counterparty: "b3nw1k",
         Status: "Completed",
         Time: "2025-12-24 15:39:19.713+00",
      },
      {
         "Order No.": 2003370147128446977,
         Type: "BUY",
         "Fiat Amount": 45000,
         Price: 78.5,
         "Coin Amount": 573.2484,
         Counterparty: "Mak1.Don",
         Status: "Completed",
         Time: "2025-12-23 07:40:39.959+00",
      },
      {
         "Order No.": 2002699776193519616,
         Type: "BUY",
         "Fiat Amount": 54650,
         Price: 78.95,
         "Coin Amount": 692.2103,
         Counterparty: "Renais",
         Status: "Completed",
         Time: "2025-12-21 11:16:50.716+00",
      },
   ];
   const [data, setData] = React.useState(() => initialData);
   const [rowSelection, setRowSelection] = React.useState({});
   const [columnVisibility, setColumnVisibility] =
      React.useState<VisibilityState>({});
   const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
      []
   );
   const [sorting, setSorting] = React.useState<SortingState>([
      {
         id: "Time",
         desc: true,
      },
   ]);
   const [pagination, setPagination] = React.useState({
      pageIndex: 0,
      pageSize: 10,
   });
   const isSortingActive = !sorting.some(
      (sort) => sort.id === "Time" && sort.desc === true
   );
   const sortableId = React.useId();
   const sensors = useSensors(
      useSensor(MouseSensor, {}),
      useSensor(TouchSensor, {}),
      useSensor(KeyboardSensor, {})
   );

   React.useEffect(() => {
      const fetchAll = async () => {
         let allData: Order[] = [];
         let from = 0;
         const STEP = 500;
         let hasMore = true;

         while (hasMore) {
            // Запрашиваем 0-499, затем 500-999, затем 1000-1499
            const res = await fetch(
               `/api/orders?from=${from}&to=${from + STEP - 1}`
            );
            const chunk: Order[] = await res.json();

            if (chunk.length > 0) {
               allData = [...allData, ...chunk];
               from += STEP;

               // Обновляем стейт сразу, чтобы юзер видел первые данные
               setData([...allData]);
            }

            // Если пришло меньше 500 строк, значит данных в базе больше нет
            if (chunk.length < STEP) {
               hasMore = false;
            }
         }

         localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      };

      fetchAll();
   }, []);
   const dataIds = React.useMemo<UniqueIdentifier[]>(
      () => data?.map((row) => row["Order No."]) || [],
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
      meta: {
         allOrders: data, // Передаем стейт сюда
      },
      // Важно: getRowId должен возвращать строку
      getRowId: (row: Order) => row["Order No."] as unknown as string,
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
      if (isSortingActive) return;

      const { active, over } = event;
      if (active && over && active.id !== over.id) {
         setData((currentData) => {
            // Используем актуальный порядок ID из модели строк таблицы,
            // чтобы корректно вычислить индексы при перемещении
            const items = table.getRowModel().rows.map((r) => r.id);
            const oldIndex = items.indexOf(active.id as string);
            const newIndex = items.indexOf(over.id as string);

            return arrayMove(currentData, oldIndex, newIndex);
         });
      }
   }

   return (
      <Tabs
         defaultValue="outline"
         className="w-full flex-col justify-start gap-6"
      >
         <div className="flex items-center justify-between px-4 lg:px-6">
            <Label htmlFor="view-selector" className="sr-only">
               View
            </Label>
            <Select defaultValue="outline">
               <SelectTrigger
                  className="flex w-fit @4xl/main:hidden"
                  size="sm"
                  id="view-selector"
               >
                  <SelectValue placeholder="Select a view" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="past-performance">
                     Past Performance
                  </SelectItem>
                  <SelectItem value="key-personnel">Key Personnel</SelectItem>
                  <SelectItem value="focus-documents">
                     Focus Documents
                  </SelectItem>
               </SelectContent>
            </Select>
            <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
               <TabsTrigger value="outline">Outline</TabsTrigger>
               <TabsTrigger value="past-performance">
                  Past Performance <Badge variant="secondary">3</Badge>
               </TabsTrigger>
               <TabsTrigger value="key-personnel">
                  Key Personnel <Badge variant="secondary">2</Badge>
               </TabsTrigger>
               <TabsTrigger value="focus-documents">
                  Focus Documents
               </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="outline" size="sm">
                        <IconLayoutColumns />
                        <span className="hidden lg:inline">
                           Customize Columns
                        </span>
                        <span className="lg:hidden">Columns</span>
                        <IconChevronDown />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                     {table
                        .getAllColumns()
                        .filter(
                           (column) =>
                              typeof column.accessorFn !== "undefined" &&
                              column.getCanHide()
                        )
                        .map((column) => {
                           return (
                              <DropdownMenuCheckboxItem
                                 key={column.id}
                                 className="capitalize"
                                 checked={column.getIsVisible()}
                                 onCheckedChange={(value) =>
                                    column.toggleVisibility(!!value)
                                 }
                              >
                                 {column.id}
                              </DropdownMenuCheckboxItem>
                           );
                        })}
                  </DropdownMenuContent>
               </DropdownMenu>
               <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                     setSorting([
                        {
                           id: "Time",
                           desc: true,
                        },
                     ])
                  }
                  disabled={!isSortingActive}
               >
                  <IconX className="size-4" />
                  <span className="hidden lg:inline">Clear Sort</span>
               </Button>
            </div>
         </div>
         <TabsContent
            value="outline"
            className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
         >
            <div className="overflow-hidden rounded-lg border">
               <DndContext
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleDragEnd}
                  sensors={sensors}
                  id={sortableId}
               >
                  <Table>
                     <TableHeader className="bg-muted sticky top-0 z-10">
                        {table.getHeaderGroups().map((headerGroup) => (
                           <TableRow key={headerGroup.id}>
                              {headerGroup.headers.map((header) => {
                                 return (
                                    <TableHead
                                       key={header.id}
                                       colSpan={header.colSpan}
                                    >
                                       {header.isPlaceholder
                                          ? null
                                          : flexRender(
                                               header.column.columnDef.header,
                                               header.getContext()
                                            )}
                                    </TableHead>
                                 );
                              })}
                           </TableRow>
                        ))}
                     </TableHeader>
                     <TableBody>
                        {table.getRowModel().rows?.length ? (
                           <SortableContext
                              items={dataIds}
                              // Отключаем стратегию перемещения, если сортировка активна
                              strategy={verticalListSortingStrategy}
                           >
                              {table.getRowModel().rows.map((row) => (
                                 <DraggableRow
                                    key={row.id}
                                    row={row}
                                    disabled={isSortingActive} // Проп в DraggableRow для скрытия handle
                                 />
                              ))}
                           </SortableContext>
                        ) : (
                           <TableRow>
                              <TableCell
                                 colSpan={columns.length}
                                 className="h-24 text-center"
                              >
                                 No results.
                              </TableCell>
                           </TableRow>
                        )}
                     </TableBody>
                  </Table>
               </DndContext>
            </div>
            <div className="flex items-center justify-between px-4">
               <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
                  {table.getFilteredSelectedRowModel().rows.length} of{" "}
                  {table.getFilteredRowModel().rows.length} row(s) selected.
               </div>
               <div className="flex w-full items-center gap-8 lg:w-fit">
                  <div className="hidden items-center gap-2 lg:flex">
                     <Label
                        htmlFor="rows-per-page"
                        className="text-sm font-medium"
                     >
                        Rows per page
                     </Label>
                     <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                           table.setPageSize(Number(value));
                        }}
                     >
                        <SelectTrigger
                           size="sm"
                           className="w-20"
                           id="rows-per-page"
                        >
                           <SelectValue
                              placeholder={table.getState().pagination.pageSize}
                           />
                        </SelectTrigger>
                        <SelectContent side="top">
                           {[10, 20, 30, 40, 50].map((pageSize) => (
                              <SelectItem key={pageSize} value={`${pageSize}`}>
                                 {pageSize}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="flex w-fit items-center justify-center text-sm font-medium">
                     Page {table.getState().pagination.pageIndex + 1} of{" "}
                     {table.getPageCount()}
                  </div>
                  <div className="ml-auto flex items-center gap-2 lg:ml-0">
                     <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                     >
                        <span className="sr-only">Go to first page</span>
                        <IconChevronsLeft />
                     </Button>
                     <Button
                        variant="outline"
                        className="size-8"
                        size="icon"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                     >
                        <span className="sr-only">Go to previous page</span>
                        <IconChevronLeft />
                     </Button>
                     <Button
                        variant="outline"
                        className="size-8"
                        size="icon"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                     >
                        <span className="sr-only">Go to next page</span>
                        <IconChevronRight />
                     </Button>
                     <Button
                        variant="outline"
                        className="hidden size-8 lg:flex"
                        size="icon"
                        onClick={() =>
                           table.setPageIndex(table.getPageCount() - 1)
                        }
                        disabled={!table.getCanNextPage()}
                     >
                        <span className="sr-only">Go to last page</span>
                        <IconChevronsRight />
                     </Button>
                  </div>
               </div>
            </div>
         </TabsContent>
         <TabsContent
            value="past-performance"
            className="flex flex-col px-4 lg:px-6"
         >
            <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
         </TabsContent>
         <TabsContent
            value="key-personnel"
            className="flex flex-col px-4 lg:px-6"
         >
            <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
         </TabsContent>
         <TabsContent
            value="focus-documents"
            className="flex flex-col px-4 lg:px-6"
         >
            <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
         </TabsContent>
      </Tabs>
   );
}

export interface MetricPoint {
   date: string; // Формат "MMM D" для оси X
   fullDate: string; // ISO для ключей
   count: number;
}

export function useCounterpartyMetrics(
   counterparty: string,
   allOrders: Order[]
) {
   return React.useMemo(() => {
      // 1. Первичная фильтрация и сортировка по времени
      const counterpartyOrders = allOrders
         .filter((o) => o.Counterparty === counterparty)
         .sort(
            (a, b) => new Date(a.Time).getTime() - new Date(b.Time).getTime()
         );

      if (counterpartyOrders.length === 0) return null;

      // 2. Инициализация агрегаторов метрик
      let totalFiatVolume = 0;
      let completedCount = 0;
      let buyCount = 0;
      let sellCount = 0;

      // Временные границы для "плотного" графика
      let firstTradeDate: Date | null = null;
      let lastTradeDate: Date | null = null;

      const frequencyMap = new Map<string, number>();

      // 3. Сбор данных за один проход
      counterpartyOrders.forEach((order) => {
         // Подсчет типов для Bias
         if (order.Type === "BUY") buyCount++;
         if (order.Type === "SELL") sellCount++;

         // Подсчет успешных сделок для LTV и Avg Ticket
         if (order.Status === "Completed") {
            completedCount++;
            const amount =
               typeof order["Fiat Amount"] === "string"
                  ? parseFloat(order["Fiat Amount"])
                  : order["Fiat Amount"];
            totalFiatVolume += isNaN(amount) ? 0 : amount;
         }

         // Группировка для частотного графика
         const d = new Date(order.Time);
         d.setHours(0, 0, 0, 0);
         const iso = d.toISOString();
         frequencyMap.set(iso, (frequencyMap.get(iso) || 0) + 1);

         // Определение границ "активного" периода
         if (!firstTradeDate || d < firstTradeDate)
            firstTradeDate = new Date(d);
         if (!lastTradeDate || d > lastTradeDate) lastTradeDate = new Date(d);
      });

      // 4. Расчет производных метрик
      const avgTicketSize =
         completedCount > 0 ? totalFiatVolume / completedCount : 0;
      const successRate = (completedCount / counterpartyOrders.length) * 100;

      let bias: "Buyer" | "Seller" | "Balanced" = "Balanced";
      let biasPercentage = 50;
      const totalCount = counterpartyOrders.length;

      if (buyCount > sellCount * 1.5) {
         bias = "Buyer";
         biasPercentage = Math.round((buyCount / totalCount) * 100);
      } else if (sellCount > buyCount * 1.5) {
         bias = "Seller";
         biasPercentage = Math.round((sellCount / totalCount) * 100);
      }

      // 5. Генерация "плотного" таймлайна (без пустых хвостов в начале/конце)
      const denseTimeline: MetricPoint[] = [];
      if (firstTradeDate && lastTradeDate) {
         // Добавляем небольшой буфер (1-2 дня) по краям для визуального отступа
         const start = new Date(firstTradeDate);
         start.setDate(start.getDate() - 1);

         const end = new Date(lastTradeDate);
         end.setDate(end.getDate() + 1);

         const iterator = new Date(start);
         while (iterator <= end) {
            const iso = iterator.toISOString();
            denseTimeline.push({
               fullDate: iso,
               date: iterator.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
               }),
               count: frequencyMap.get(iso) || 0,
            });
            iterator.setDate(iterator.getDate() + 1);
         }
      }

      return {
         trustScore: totalFiatVolume,
         avgTicketSize,
         successRate,
         bias,
         biasPercentage,
         frequencyData: denseTimeline,
         totalOrders: totalCount,
      };
   }, [counterparty, allOrders]);
}

export default function TableCellViewer({
   item,
   allOrders,
}: {
   item: Order;
   allOrders: Order[];
}) {
   const isMobile = useIsMobile();
   const title = item["Order No."];

   const metrics = useCounterpartyMetrics(item.Counterparty, allOrders);

   return (
      <Drawer direction={isMobile ? "bottom" : "right"}>
         <DrawerTrigger asChild>
            <Button
               variant="link"
               className="text-foreground w-fit px-0 text-left"
            >
               {title}
            </Button>
         </DrawerTrigger>
         <DrawerContent>
            <DrawerHeader className="gap-1">
               <DrawerTitle>Order: {title}</DrawerTitle>
               <DrawerDescription>
                  Counterparty: {item.Counterparty}
               </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm pb-4">
               {!isMobile && metrics && (
                  <>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2 p-4 border rounded-lg">
                           <div className="text-xs text-muted-foreground font-medium">
                              Trust Score (LTV)
                           </div>
                           <div className="text-2xl font-bold">
                              ₽
                              {metrics.trustScore.toLocaleString("en-US", {
                                 maximumFractionDigits: 0,
                              })}
                           </div>
                           <div className="text-xs text-muted-foreground">
                              Total completed volume
                           </div>
                        </div>
                        <div className="flex flex-col gap-2 p-4 border rounded-lg">
                           <div className="text-xs text-muted-foreground font-medium">
                              Average Ticket
                           </div>
                           <div className="text-2xl font-bold">
                              ₽
                              {metrics.avgTicketSize.toLocaleString("en-US", {
                                 maximumFractionDigits: 0,
                              })}
                           </div>
                           <div className="text-xs text-muted-foreground">
                              Per transaction
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2 p-4 border rounded-lg">
                           <div className="text-xs text-muted-foreground font-medium">
                              Success Rate
                           </div>
                           <div className="text-2xl font-bold">
                              {metrics.successRate.toFixed(1)}%
                           </div>
                           <div className="text-xs text-muted-foreground">
                              {metrics.totalOrders} total orders
                           </div>
                        </div>
                        <div className="flex flex-col gap-2 p-4 border rounded-lg">
                           <div className="text-xs text-muted-foreground font-medium">
                              Trade Direction
                           </div>
                           <div className="text-2xl font-bold flex items-center gap-2">
                              {metrics.bias}
                              {metrics.bias === "Buyer" ? (
                                 <TrendingUp className="size-5 text-green-500" />
                              ) : metrics.bias === "Seller" ? (
                                 <TrendingDown className="size-5 text-red-500" />
                              ) : null}
                           </div>
                           <div className="text-xs text-muted-foreground">
                              {metrics.biasPercentage}% tendency
                           </div>
                        </div>
                     </div>

                     <Separator />

                     <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between font-medium">
                           <span className="text-sm">Trade Activity</span>
                           <span className="text-xs text-muted-foreground">
                              Dense view
                           </span>
                        </div>

                        <ChartContainer
                           config={{
                              count: {
                                 label: "Trades",
                              },
                           }}
                           className="h-[180px] w-full"
                        >
                           <BarChart
                              data={metrics.frequencyData}
                              margin={{
                                 top: 5,
                                 right: 5,
                                 left: -25,
                                 bottom: 0,
                              }}
                           >
                              <CartesianGrid
                                 vertical={false}
                                 strokeDasharray="3 3"
                                 className="stroke-muted/30"
                              />
                              <XAxis
                                 dataKey="date"
                                 tickLine={false}
                                 axisLine={false}
                                 fontSize={10}
                                 minTickGap={20}
                                 tickMargin={10}
                              />
                              <YAxis
                                 fontSize={10}
                                 tickLine={false}
                                 axisLine={false}
                                 allowDecimals={false}
                                 domain={[0, "dataMax + 1"]}
                              />
                              <ChartTooltip
                                 cursor={{
                                    fill: "hsl(var(--primary))",
                                    opacity: 0.1,
                                 }}
                                 content={<ChartTooltipContent hideLabel />}
                              />
                              <Bar
                                 dataKey="count"
                                 className="fill-primary"
                                 radius={[2, 2, 0, 0]}
                                 // Если данных мало, бары будут широкими, если много — узкими
                                 maxBarSize={15}
                              />
                           </BarChart>
                        </ChartContainer>
                     </div>

                     <Separator />
                  </>
               )}
               <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                     <Label htmlFor="orderNo">Order No.</Label>
                     <Input
                        id="orderNo"
                        defaultValue={item["Order No."]}
                        readOnly
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-3">
                        <Label htmlFor="type">Type</Label>
                        <Select defaultValue={item.Type}>
                           <SelectTrigger id="type" className="w-full">
                              <SelectValue placeholder="Select a type" />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="BUY">Buy</SelectItem>
                              <SelectItem value="SELL">Sell</SelectItem>
                           </SelectContent>
                        </Select>
                     </div>
                     <div className="flex flex-col gap-3">
                        <Label htmlFor="status">Status</Label>
                        <Select defaultValue={item.Status}>
                           <SelectTrigger id="status" className="w-full">
                              <SelectValue placeholder="Select a status" />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="Completed">
                                 Completed
                              </SelectItem>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Cancelled">
                                 Cancelled
                              </SelectItem>
                           </SelectContent>
                        </Select>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-3">
                        <Label htmlFor="fiatAmount">Fiat Amount</Label>
                        <Input
                           id="fiatAmount"
                           defaultValue={item["Fiat Amount"]}
                           type="number"
                        />
                     </div>
                     <div className="flex flex-col gap-3">
                        <Label htmlFor="price">Price</Label>
                        <Input
                           id="price"
                           defaultValue={item.Price}
                           type="number"
                        />
                     </div>
                  </div>
                  <div className="flex flex-col gap-3">
                     <Label htmlFor="counterparty">Counterparty</Label>
                     <Input
                        id="counterparty"
                        defaultValue={item.Counterparty}
                     />
                  </div>
               </div>
            </div>
            <DrawerFooter>
               <Button>Save Changes</Button>
               <DrawerClose asChild>
                  <Button variant="outline">Close</Button>
               </DrawerClose>
            </DrawerFooter>
         </DrawerContent>
      </Drawer>
   );
}
