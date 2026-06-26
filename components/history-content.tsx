"use client"

import * as React from "react"
import { CalendarSearchIcon, ClipboardListIcon, HistoryIcon } from "lucide-react"
import { FieldSelect } from "@/components/field-select"
import { RefillTable, type RefillItem } from "@/components/refill-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDOByCode, type DeliveryOrder } from "@/lib/do-store"
import {
  getRefillHistory,
  type RefillHistoryEntry,
} from "@/lib/refill-history-store"

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function sortSlots(items: RefillItem[]) {
  return [...items].sort((a, b) =>
    a.slot.localeCompare(b.slot, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  )
}

export function HistoryContent() {
  const [selectedMachine, setSelectedMachine] = React.useState("")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [historyEntries, setHistoryEntries] = React.useState<RefillHistoryEntry[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [loadingDO, setLoadingDO] = React.useState(false)
  const [isDoDialogOpen, setIsDoDialogOpen] = React.useState(false)
  const [selectedDO, setSelectedDO] = React.useState<DeliveryOrder | null>(null)

  React.useEffect(() => {
    if (!selectedMachine) {
      return
    }

    setLoading(true)
    getRefillHistory({
      machineId: selectedMachine,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }).then((entries) => {
      setHistoryEntries(entries)
      setLoading(false)
    })
  }, [selectedMachine, fromDate, toDate])

  const machineEntries = historyEntries

  const effectiveSelectedHistoryId = React.useMemo(() => {
    if (machineEntries.length === 0) return null
    const exists = machineEntries.some((entry) => entry.id === selectedHistoryId)
    return exists ? selectedHistoryId : machineEntries[0].id
  }, [machineEntries, selectedHistoryId])

  const selectedHistory = React.useMemo(
    () => machineEntries.find((entry) => entry.id === effectiveSelectedHistoryId) ?? null,
    [machineEntries, effectiveSelectedHistoryId]
  )

  const selectedItems = React.useMemo(
    () => sortSlots(selectedHistory?.items ?? []),
    [selectedHistory]
  )

  async function handleViewDO() {
    if (!selectedHistory?.doCode) return

    setLoadingDO(true)
    const order = await getDOByCode(selectedHistory.doCode)
    setSelectedDO(order)
    setIsDoDialogOpen(true)
    setLoadingDO(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <FieldSelect value={selectedMachine} onChange={setSelectedMachine} />
        </div>
        <div className="flex items-end gap-2 rounded-lg border bg-muted/20 px-2.5 py-2">
          <CalendarSearchIcon className="mb-2 size-4 text-muted-foreground" />
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground">From</p>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground">To</p>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mb-0.5 h-8"
            onClick={() => {
              setFromDate("")
              setToDate("")
            }}
            disabled={!fromDate && !toDate}
          >
            Clear
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          className="mb-0.5 gap-1.5"
          variant={selectedHistory?.doCode ? "default" : "outline"}
          disabled={!selectedHistory?.doCode || loadingDO}
          onClick={handleViewDO}
        >
          <ClipboardListIcon className="size-3.5" />
          {loadingDO ? "Loading DO..." : "DO"}
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/40">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            History Records
          </span>
          <span className="text-[11px] text-muted-foreground">
            {selectedMachine
              ? `${machineEntries.length} records`
              : "Choose machine"}
          </span>
        </div>

        {!selectedMachine ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Choose machine to view history.
          </div>
        ) : loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        ) : machineEntries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <HistoryIcon className="size-8 opacity-40" />
            <p className="text-sm">No history found for this machine.</p>
          </div>
        ) : (
          <div className="p-3">
            <div className="flex flex-wrap gap-2">
              {machineEntries.map((entry) => {
                  const isActive = entry.id === effectiveSelectedHistoryId
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedHistoryId(entry.id)}
                    className={`rounded-md border px-3 py-1.5 text-left text-xs transition ${
                      isActive
                        ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    <p className="font-medium">{formatDateTime(entry.date)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.doCode ? `DO ${entry.doCode}` : "Manual refill (No DO)"}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {selectedMachine && selectedHistory && selectedItems.length > 0 && (
        <RefillTable
          machineId={selectedMachine}
          items={selectedItems}
          isEditable={false}
          showDoButton={false}
        />
      )}

      <Dialog open={isDoDialogOpen} onOpenChange={setIsDoDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>DO Detail</DialogTitle>
            <DialogDescription>
              {selectedDO
                ? `${selectedDO.code} - ${selectedDO.machineId} (${selectedDO.machineLabel})`
                : "DO not found for this history record."}
            </DialogDescription>
          </DialogHeader>

          {selectedDO ? (
            <div className="max-h-[60vh] overflow-auto rounded-lg border">
              <Table className="text-xs min-w-[700px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">Slot</TableHead>
                    <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">Product</TableHead>
                    <TableHead className="text-left text-[11px] font-semibold tracking-wide py-2">Code</TableHead>
                    <TableHead className="text-right text-[11px] font-semibold tracking-wide py-2">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDO.items.map((item) => (
                    <TableRow key={`${item.slot}-${item.productCode}`} className="h-9">
                      <TableCell className="py-1.5 font-mono font-bold tracking-wider">
                        {item.slot}
                      </TableCell>
                      <TableCell className="py-1.5 font-medium">{item.productName}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground">{item.productCode}</TableCell>
                      <TableCell className="py-1.5 text-right font-semibold tabular-nums">{item.qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              This history record does not have a linked DO.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
