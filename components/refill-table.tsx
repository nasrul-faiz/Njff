"use client"

import * as React from "react"
import { CheckIcon, ClipboardCopyIcon, ClipboardListIcon } from "lucide-react"
import { ImageLightbox } from "@/components/image-lightbox"
import { getAllDOs, DELIVERY_ORDERS_STORAGE_KEY, DELIVERY_ORDERS_UPDATED_EVENT, type DeliveryOrder } from "@/lib/do-store"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface RefillItem {
  slot: string
  productCode: string
  productName: string
  image: string
  stockIn: number
  overflow: number
  stockOut: number
  currentInventory: number
  maxCapacity: number
}

interface RowValues {
  stockIn: number
  overflow: number
  stockOut: number
}

interface RefillTableProps {
  machineId: string
  items: RefillItem[]
  prefilledStockIn?: Record<string, number>
  isEditable?: boolean
  onValuesChange?: (values: Record<string, RowValues>) => void
}

const inputCls =
  "w-16 rounded-md border bg-background px-1.5 py-1 text-center text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"

export function RefillTable({ machineId, items, prefilledStockIn, isEditable = true, onValuesChange }: RefillTableProps) {
  const [allOrders, setAllOrders] = React.useState<DeliveryOrder[]>([])
  const [isViewDOpen, setIsViewDOOpen] = React.useState(false)
  const [copiedCode, setCopiedCode] = React.useState("")
  const [doCodeFilter, setDoCodeFilter] = React.useState("")

  React.useEffect(() => {
    async function reloadOrders() {
      const orders = await getAllDOs()
      setAllOrders(orders)
    }

    reloadOrders()

    function handleStorage(event: StorageEvent) {
      if (event.key === DELIVERY_ORDERS_STORAGE_KEY) {
        reloadOrders()
      }
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener(DELIVERY_ORDERS_UPDATED_EVENT, reloadOrders)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(DELIVERY_ORDERS_UPDATED_EVENT, reloadOrders)
    }
  }, [])

  const machineOrders = React.useMemo(
    () =>
      allOrders
        .filter((order) => order.machineId === machineId)
        .sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === "pending" ? -1 : 1
          }
          return b.date.localeCompare(a.date)
        }),
    [allOrders, machineId]
  )

  const filteredOrders = React.useMemo(() => {
    const keyword = doCodeFilter.trim().toUpperCase()
    if (!keyword) return machineOrders
    return machineOrders.filter((order) =>
      order.code.toUpperCase().includes(keyword)
    )
  }, [machineOrders, doCodeFilter])

  const currentOrders = React.useMemo(
    () => filteredOrders.filter((order) => order.status === "pending"),
    [filteredOrders]
  )

  const previousOrders = React.useMemo(
    () => filteredOrders.filter((order) => order.status === "completed"),
    [filteredOrders]
  )

  const totalQty = React.useMemo(
    () =>
      filteredOrders.reduce(
        (sum, order) =>
          sum + order.items.reduce((itemSum, item) => itemSum + item.qty, 0),
        0
      ),
    [filteredOrders]
  )

  const filteredOrderLines = React.useMemo(
    () =>
      filteredOrders
        .flatMap((order) =>
        order.items.map((item) => ({
          doCode: order.code,
          slot: item.slot,
          productCode: item.productCode,
          productName: item.productName,
          qty: item.qty,
        }))
      )
      .sort((a, b) => {
        const codeCompare = a.doCode.localeCompare(b.doCode, undefined, {
          numeric: true,
          sensitivity: "base",
        })
        if (codeCompare !== 0) return codeCompare

        return a.slot.localeCompare(b.slot, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      }),
    [filteredOrders]
  )

  const orderTotalMap = React.useMemo(
    () =>
      Object.fromEntries(
        filteredOrders.map((order) => [
          order.code,
          order.items.reduce((sum, item) => sum + item.qty, 0),
        ])
      ),
    [filteredOrders]
  )
  const readonlyInputCls = !isEditable
    ? "text-muted-foreground disabled:text-muted-foreground disabled:opacity-100"
    : ""

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      window.setTimeout(() => {
        setCopiedCode((current) => (current === code ? "" : current))
      }, 1200)
    } catch {
      setCopiedCode("")
    }
  }

  const sortedItems = React.useMemo(
    () =>
      [...items].sort((a, b) =>
        a.slot.localeCompare(b.slot, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [items]
  )

  const itemMap = React.useMemo(
    () => Object.fromEntries(items.map((i) => [i.slot, i])),
    [items]
  )

  const calcOverflow = (slot: string, stockIn: number) => {
    const item = itemMap[slot]
    if (!item) return 0
    const available = item.maxCapacity - item.currentInventory
    return Math.max(0, stockIn - available)
  }

  const [values, setValues] = React.useState<Record<string, RowValues>>(
    () =>
      Object.fromEntries(
        items.map((item) => {
          const stockIn = prefilledStockIn?.[item.slot] ?? item.stockIn
          const available = item.maxCapacity - item.currentInventory
          const overflow = prefilledStockIn?.[item.slot] != null
            ? Math.max(0, stockIn - available)
            : item.overflow
          return [item.slot, { stockIn, overflow, stockOut: item.stockOut }]
        })
      )
  )

  React.useEffect(() => {
    onValuesChange?.(values)
  }, [values, onValuesChange])

  function handleChange(slot: string, field: keyof RowValues, raw: string) {
    const num = raw === "" ? 0 : Math.max(0, parseInt(raw) || 0)
    setValues((prev) => {
      const item = itemMap[slot]
      const baseStockIn = prefilledStockIn?.[slot] ?? item?.stockIn ?? 0
      const baseOverflow = prefilledStockIn?.[slot] != null
        ? calcOverflow(slot, baseStockIn)
        : (item?.overflow ?? 0)
      const baseStockOut = item?.stockOut ?? 0
      const current = prev[slot] ?? {
        stockIn: baseStockIn,
        overflow: baseOverflow,
        stockOut: baseStockOut,
      }
      const updated = { ...current, [field]: num }
      if (field === "stockIn") {
        updated.overflow = calcOverflow(slot, num)
      }
      return { ...prev, [slot]: updated }
    })
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden text-xs">
      {/* Header bar */}
      <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/40">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
          {machineId}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{items.length} slots</span>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsViewDOOpen(true)}
            className={`h-7 text-[11px] gap-1.5 px-2.5 ${machineOrders.length > 0 ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            variant={machineOrders.length > 0 ? "default" : "outline"}
          >
            <ClipboardListIcon className="size-3.5" />
            View DO
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
      <Table className="text-xs min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {["Slot", "Stock In", "Overflow", "Stock Out", "Inventory", "", "Product Name", "Max"].map(
              (h, i) => (
                <TableHead
                  key={i}
                  className="text-center text-[11px] font-semibold tracking-wide py-2"
                >
                  {h}
                </TableHead>
              )
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedItems.map((item) => {
            const baseStockIn = prefilledStockIn?.[item.slot] ?? item.stockIn
            const baseOverflow = prefilledStockIn?.[item.slot] != null
              ? calcOverflow(item.slot, baseStockIn)
              : item.overflow
            const row = values[item.slot] ?? {
              stockIn: baseStockIn,
              overflow: baseOverflow,
              stockOut: item.stockOut,
            }
            return (
              <TableRow key={item.slot} className="h-10">
                {/* Slot */}
                <TableCell className="text-center py-1.5">
                  <span className="font-mono font-bold tracking-wider">{item.slot}</span>
                </TableCell>

                {/* Stock In */}
                <TableCell className="text-center py-1.5">
                  <input
                    type="number"
                    min={0}
                    disabled={!isEditable}
                    value={row.stockIn === 0 ? "" : row.stockIn}
                    placeholder="0"
                    onChange={(e) => handleChange(item.slot, "stockIn", e.target.value)}
                    className={`${inputCls} ${readonlyInputCls} ${prefilledStockIn?.[item.slot] != null ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-300" : ""}`}
                  />
                </TableCell>

                {/* Overflow */}
                <TableCell className="text-center py-1.5">
                  <input
                    type="number"
                    min={0}
                    disabled={!isEditable}
                    value={row.overflow === 0 ? "" : row.overflow}
                    placeholder="0"
                    onChange={(e) => handleChange(item.slot, "overflow", e.target.value)}
                    className={`${inputCls} ${readonlyInputCls}`}
                  />
                </TableCell>

                {/* Stock Out */}
                <TableCell className="text-center py-1.5">
                  <input
                    type="number"
                    min={0}
                    disabled={!isEditable}
                    value={row.stockOut === 0 ? "" : row.stockOut}
                    placeholder="0"
                    onChange={(e) => handleChange(item.slot, "stockOut", e.target.value)}
                    className={`${inputCls} ${readonlyInputCls}`}
                  />
                </TableCell>

                {/* Inventory */}
                <TableCell className="text-center py-1.5 font-semibold tabular-nums">
                  {item.currentInventory}
                </TableCell>

                {/* Image */}
                <TableCell className="text-center py-1.5 px-1.5">
                  <div className="h-8 w-8 mx-auto rounded-md overflow-hidden border bg-muted">
                    {item.image ? (
                      <ImageLightbox src={item.image} alt={item.productName}>
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      </ImageLightbox>
                    ) : null}
                  </div>
                </TableCell>

                {/* Product Name */}
                <TableCell className="text-center py-1.5 max-w-[180px]">
                  <p className="truncate font-medium">{item.productName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{item.productCode}</p>
                </TableCell>

                {/* Max */}
                <TableCell className="text-center py-1.5 text-muted-foreground tabular-nums">
                  {item.maxCapacity}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>

      <Dialog open={isViewDOpen} onOpenChange={setIsViewDOOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>View DO - {machineId}</DialogTitle>
            <DialogDescription>
              {filteredOrders.length} DO(s) with {filteredOrderLines.length} item line(s), total qty {totalQty}.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/20 px-3 py-3">
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-muted-foreground">
              Paste DO code to filter
            </label>
            <input
              type="text"
              value={doCodeFilter}
              onChange={(event) => setDoCodeFilter(event.target.value.toUpperCase())}
              placeholder="e.g. DO-260623-001"
              className="w-full rounded-md border bg-background px-3 py-1.5 text-xs font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/20 px-3 py-3">
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
                Current DO ({currentOrders.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {currentOrders.map((order) => (
                  <button
                    key={order.code}
                    type="button"
                    onClick={() => handleCopyCode(order.code)}
                    className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-left text-xs shadow-sm transition hover:bg-muted"
                    title="Click to copy DO code"
                  >
                    <span className="font-semibold text-muted-foreground">DO</span>
                    <span className="font-mono font-bold tracking-wider">{order.code}</span>
                    <span className="text-[10px] text-muted-foreground">Qty {orderTotalMap[order.code] ?? 0}</span>
                    {copiedCode === order.code ? (
                      <CheckIcon className="size-3.5 text-emerald-600" />
                    ) : (
                      <ClipboardCopyIcon className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                ))}
                {currentOrders.length === 0 && (
                  <p className="text-xs text-muted-foreground">No current DO.</p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
                Previous DO ({previousOrders.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {previousOrders.map((order) => (
                  <button
                    key={order.code}
                    type="button"
                    onClick={() => handleCopyCode(order.code)}
                    className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-left text-xs shadow-sm transition hover:bg-muted"
                    title="Click to copy DO code"
                  >
                    <span className="font-semibold text-muted-foreground">DO</span>
                    <span className="font-mono font-bold tracking-wider">{order.code}</span>
                    <span className="text-[10px] text-muted-foreground">Qty {orderTotalMap[order.code] ?? 0}</span>
                    {copiedCode === order.code ? (
                      <CheckIcon className="size-3.5 text-emerald-600" />
                    ) : (
                      <ClipboardCopyIcon className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                ))}
                {previousOrders.length === 0 && (
                  <p className="text-xs text-muted-foreground">No previous DO.</p>
                )}
              </div>
            </div>

            {filteredOrders.length === 0 && (
              <p className="text-xs text-muted-foreground">No DO found for this machine.</p>
            )}
          </div>

          <div className="max-h-[60vh] overflow-auto rounded-lg border">
            <Table className="text-xs min-w-[780px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">DO Code</TableHead>
                  <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2">Slot</TableHead>
                  <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">Product</TableHead>
                  <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">Code</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold tracking-wide py-2">Qty</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold tracking-wide py-2">Total Qty (DO)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrderLines.map((item) => (
                  <TableRow key={`${item.doCode}-${item.slot}-${item.productCode}`} className="h-9">
                    <TableCell className="py-1.5 font-mono font-bold tracking-wider">
                      {item.doCode}
                    </TableCell>
                    <TableCell className="text-center py-1.5">
                      <span className="font-mono font-bold tracking-wider">{item.slot}</span>
                    </TableCell>
                    <TableCell className="py-1.5 font-medium">{item.productName}</TableCell>
                    <TableCell className="py-1.5 text-muted-foreground">{item.productCode}</TableCell>
                    <TableCell className="py-1.5 text-right font-semibold tabular-nums">{item.qty}</TableCell>
                    <TableCell className="py-1.5 text-right font-semibold tabular-nums text-muted-foreground">
                      {orderTotalMap[item.doCode] ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrderLines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      No item list for the selected DO filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
