"use client"

import * as React from "react"
import {
  SearchIcon,
  MoreHorizontalIcon,
  EyeIcon,
  DownloadIcon,
  XIcon,
  CheckCircleIcon,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAllDOs, type DeliveryOrder } from "@/lib/do-store"

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })
}

function ActionMenu({
  do: order,
  onView,
}: {
  do: DeliveryOrder
  onView: (order: DeliveryOrder) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreHorizontalIcon className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 w-32 rounded-lg border bg-popover shadow-lg py-1 text-xs">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
            onClick={() => {
              setOpen(false)
              onView(order)
            }}
          >
            <EyeIcon className="size-3.5 shrink-0" />
            View
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-muted-foreground"
            onClick={() => setOpen(false)}
            disabled
          >
            <DownloadIcon className="size-3.5 shrink-0" />
            Export
          </button>
        </div>
      )}
    </div>
  )
}

function DODetailSheet({
  order,
  onClose,
}: {
  order: DeliveryOrder
  onClose: () => void
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="size-4 text-emerald-600" />
          <span className="text-sm font-semibold">DO Detail</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 hover:bg-muted text-muted-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      <div className="px-4 py-3 grid grid-cols-2 gap-4 border-b bg-muted/20 text-xs">
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mb-0.5">
            DO Code
          </p>
          <p className="font-mono font-bold">{order.code}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mb-0.5">
            Machine
          </p>
          <p className="font-bold">
            {order.machineId}{" "}
            <span className="text-muted-foreground font-normal">
              ({order.machineLabel})
            </span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mb-0.5">
            Date
          </p>
          <p className="font-medium">{formatDate(order.date)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase mb-0.5">
            Status
          </p>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              order.status === "completed"
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
            }`}
          >
            {order.status}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2">Slot</TableHead>
              <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2"></TableHead>
              <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2">Product Name</TableHead>
              <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2">Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={`${item.slot}-${item.productCode}`} className="h-9">
                <TableCell className="text-center py-1.5">
                  <span className="font-mono font-bold tracking-wider">{item.slot}</span>
                </TableCell>
                <TableCell className="text-center py-1.5 px-1.5">
                  <div className="h-8 w-8 mx-auto rounded-md overflow-hidden border bg-muted">
                    {item.image ? (
                      <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-center py-1.5 font-medium">
                  <p className="truncate">{item.productName}</p>
                  <p className="text-[10px] text-muted-foreground">{item.productCode}</p>
                </TableCell>
                <TableCell className="text-center py-1.5 font-semibold tabular-nums">
                  {item.qty}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{order.items.length} items</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total units:</span>
          <span className="font-bold tabular-nums">
            {order.items.reduce((a, b) => a + b.qty, 0)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ViewDOContent() {
  const [allDOs, setAllDOs] = React.useState<DeliveryOrder[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [viewingDO, setViewingDO] = React.useState<DeliveryOrder | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    getAllDOs().then((dos) => {
      setAllDOs(dos)
      setLoading(false)
    })
    inputRef.current?.focus()
  }, [])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allDOs
    return allDOs.filter(
      (d) =>
        d.machineId.toLowerCase().includes(q) ||
        d.machineLabel.toLowerCase().includes(q)
    )
  }, [allDOs, search])

  return (
    <div className="flex flex-col gap-6">
      {/* Search */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Search Delivery Orders
          </p>
        </div>
        <div className="px-4 py-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setViewingDO(null)
              }}
              placeholder="Search by Machine ID or Location — e.g. M0013 or Rawang"
              className="w-full rounded-lg border bg-background pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("")
                  setViewingDO(null)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detail view (shown when View is clicked) */}
      {viewingDO && (
        <DODetailSheet order={viewingDO} onClose={() => setViewingDO(null)} />
      )}

      {/* Results table */}
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <SearchIcon className="size-10 opacity-30" />
          <p className="text-sm">
            {search
              ? `No results for "${search}"`
              : "No delivery orders found."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {["Code", "Time Refill", "Date", "Action"].map((h) => (
                  <TableHead
                    key={h}
                    className="text-center text-[11px] font-semibold tracking-wide py-2"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.code} className="h-10">
                  <TableCell className="text-center py-1.5">
                    <span className="font-mono font-bold tracking-wider text-xs">
                      {order.code}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-1.5 tabular-nums">
                    {formatTime(order.date)}
                  </TableCell>
                  <TableCell className="text-center py-1.5">
                    {formatDate(order.date)}
                  </TableCell>
                  <TableCell className="text-center py-1.5">
                    <ActionMenu do={order} onView={setViewingDO} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
            {filtered.length} order{filtered.length !== 1 && "s"} found
          </div>
        </div>
      )}
    </div>
  )
}
