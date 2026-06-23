"use client"

import * as React from "react"
import { AlertCircleIcon, CheckCircleIcon, SearchIcon, XIcon } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { getDOByCode, type DeliveryOrder } from "@/lib/do-store"

export function ViewDOContent() {
  const [doCode, setDoCode] = React.useState("")
  const [doError, setDoError] = React.useState("")
  const [searchedDO, setSearchedDO] = React.useState<DeliveryOrder | null>(null)

  function handleSearchDO(e: React.FormEvent) {
    e.preventDefault()
    if (!doCode.trim()) {
      setDoError("Please enter a DO code.")
      return
    }

    getDOByCode(doCode.trim().toUpperCase()).then((found) => {
      if (!found) {
        setDoError(`"${doCode.toUpperCase()}" not found.`)
        setSearchedDO(null)
        return
      }
      setSearchedDO(found)
      setDoError("")
    })
  }

  function handleClear() {
    setDoCode("")
    setSearchedDO(null)
    setDoError("")
  }

  const dateObj = searchedDO ? new Date(searchedDO.date) : null
  const formatted = dateObj
    ? dateObj.toLocaleDateString("en-MY", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""

  return (
    <div className="flex flex-col gap-6">
      {/* Search section */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Search Delivery Order
          </p>
        </div>

        <form onSubmit={handleSearchDO} className="px-4 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <input
                autoFocus
                type="text"
                value={doCode}
                onChange={(e) => {
                  setDoCode(e.target.value.toUpperCase())
                  setDoError("")
                }}
                placeholder="Enter DO code — e.g. DO-260622-ABC1"
                className="rounded-lg border bg-background px-3 py-2 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-ring w-full"
              />
              {doError && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircleIcon className="size-3 shrink-0" />
                  {doError}
                </div>
              )}
            </div>
            <Button type="submit" size="sm" className="gap-1.5 shrink-0 mt-1">
              <SearchIcon className="size-3.5" />
              Search
            </Button>
          </div>
        </form>
      </div>

      {/* Results section */}
      {searchedDO && (
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Status header */}
          <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="size-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                DO Found
              </span>
            </div>
            <button
              onClick={handleClear}
              className="rounded p-1 hover:bg-muted text-muted-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>

          {/* DO details */}
          <div className="px-4 py-3 grid grid-cols-2 gap-4 border-b bg-muted/20">
            <div>
              <p className="text-[11px] text-muted-foreground font-semibold tracking-widest uppercase">
                DO Code
              </p>
              <p className="text-sm font-mono font-bold mt-0.5">{searchedDO.code}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-semibold tracking-widest uppercase">
                Machine
              </p>
              <p className="text-sm font-bold mt-0.5">
                {searchedDO.machineId}{" "}
                <span className="text-xs text-muted-foreground">
                  ({searchedDO.machineLabel})
                </span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-semibold tracking-widest uppercase">
                Date
              </p>
              <p className="text-sm font-medium mt-0.5">{formatted}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-semibold tracking-widest uppercase">
                Status
              </p>
              <p className="text-sm font-medium mt-0.5 capitalize">
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    searchedDO.status === "completed"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {searchedDO.status}
                </span>
              </p>
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center text-[11px] font-semibold tracking-wide py-2">
                    Slot
                  </TableHead>
                  <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">
                    Product Code
                  </TableHead>
                  <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">
                    Product Name
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-semibold tracking-wide py-2">
                    Qty
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchedDO.items.map((item) => (
                  <TableRow key={`${item.slot}-${item.productCode}`} className="h-9">
                    <TableCell className="text-center py-1.5">
                      <span className="font-mono font-bold tracking-wider">
                        {item.slot}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 text-muted-foreground">
                      {item.productCode}
                    </TableCell>
                    <TableCell className="py-1.5 font-medium">
                      {item.productName}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-semibold tabular-nums">
                      {item.qty}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer summary */}
          <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {searchedDO.items.length} items
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total units:</span>
              <span className="font-bold tabular-nums">
                {searchedDO.items.reduce((a, b) => a + b.qty, 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!searchedDO && !doError && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
          <SearchIcon className="size-10 opacity-30" />
          <p className="text-sm">Enter a DO code to view delivery order details.</p>
        </div>
      )}
    </div>
  )
}
