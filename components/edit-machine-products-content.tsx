"use client"

import * as React from "react"
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { getMachines, type Machine } from "@/lib/machine-store"
import { getProducts } from "@/lib/product-store"
import {
  getRefillData,
  upsertRefillItems,
  deleteRefillItem,
} from "@/lib/refill-store"
import type { RefillItem } from "@/components/refill-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ImageLightbox } from "@/components/image-lightbox"

type Product = Pick<RefillItem, "productCode" | "productName" | "image">

interface Placement {
  machineId: string
  slot: string
  productCode: string
  maxCapacity: number
  stockIn: number
  overflow: number
  stockOut: number
  currentInventory: number
}

const inputCls =
  "w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"

interface PlacementEditRowProps {
  item: Placement
  products: Product[]
  draft: Placement
  onDraftChange: (placement: Placement) => void
  onCancel: () => void
}

function PlacementEditRow({
  item,
  products,
  draft,
  onDraftChange,
  onCancel,
}: PlacementEditRowProps) {
  return (
    <TableRow className="bg-accent/20">
      <TableCell className="py-1.5 text-center">
        <input
          className={inputCls}
          value={draft.slot}
          onChange={(e) => onDraftChange({ ...draft, slot: e.target.value })}
          placeholder="A1"
        />
      </TableCell>
      <TableCell className="py-1.5">
        <select
          className={inputCls}
          value={draft.productCode}
          onChange={(e) => onDraftChange({ ...draft, productCode: e.target.value })}
        >
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p.productCode} value={p.productCode}>
              {p.productCode} — {p.productName}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell className="py-1.5 text-center">
        <input
          type="number"
          min={0}
          className={inputCls}
          value={draft.maxCapacity}
          onChange={(e) =>
            onDraftChange({ ...draft, maxCapacity: Math.max(0, parseInt(e.target.value) || 0) })
          }
        />
      </TableCell>
      <TableCell className="py-1.5">
        <div className="flex justify-center gap-1">
          <button
            onClick={onCancel}
            className="rounded p-1 hover:bg-muted text-muted-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  )
}

interface EditMachineProductsContentProps {
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>
}

export function EditMachineProductsContent({ onSaveRef }: EditMachineProductsContentProps) {
  const [machines, setMachines] = React.useState<Machine[]>([])
  const [products, setProducts] = React.useState<Product[]>([])
  const [placements, setPlacements] = React.useState<Placement[]>([])
  const [drafts, setDrafts] = React.useState<Record<string, Placement>>({})
  const [loading, setLoading] = React.useState(true)
  const [selectedMachine, setSelectedMachine] = React.useState("")
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [newPlacement, setNewPlacement] = React.useState<Placement>({
    machineId: "",
    slot: "",
    productCode: "",
    maxCapacity: 10,
    stockIn: 0,
    overflow: 0,
    stockOut: 0,
    currentInventory: 0,
  })

  React.useEffect(() => {
    Promise.all([getMachines(), getRefillData(), getProducts()]).then(([ms, data, prods]) => {
      setMachines(ms)

      const flat: Placement[] = []
      for (const [machineId, items] of Object.entries(data)) {
        for (const item of items) {
          flat.push({
            machineId,
            slot: item.slot,
            productCode: item.productCode,
            maxCapacity: item.maxCapacity,
            stockIn: item.stockIn,
            overflow: item.overflow,
            stockOut: item.stockOut,
            currentInventory: item.currentInventory,
          })
        }
      }
      setPlacements(flat)
      setProducts(prods.map((p) => ({ productCode: p.productCode, productName: p.productName, image: p.image })))

      const first = ms[0]?.value ?? ""
      setSelectedMachine(first)
      setNewPlacement((prev) => ({ ...prev, machineId: first }))
      setLoading(false)
    })
  }, [])

  const placementKey = (p: Placement) => `${p.machineId}::${p.slot}`

  const visiblePlacements = placements
    .filter((p) => p.machineId === selectedMachine)
    .sort((a, b) => a.slot.localeCompare(b.slot))

  const productMap = React.useMemo(
    () => new Map(products.map((p) => [p.productCode, p])),
    [products]
  )

  const handleSaveAll = React.useCallback(async () => {
    const itemsToSave: Array<RefillItem & { machine_id: string }> = []

    for (const [key, draft] of Object.entries(drafts)) {
      const slot = draft.slot.trim().toUpperCase()
      const code = draft.productCode.trim().toUpperCase()
      if (!draft.machineId || !slot || !code) continue

      const product = productMap.get(code)
      if (!product) continue

      const item: RefillItem & { machine_id: string } = {
        machine_id: draft.machineId,
        slot,
        productCode: code,
        productName: product.productName,
        image: product.image,
        maxCapacity: Math.max(0, draft.maxCapacity),
        stockIn: draft.stockIn,
        overflow: draft.overflow,
        stockOut: draft.stockOut,
        currentInventory: draft.currentInventory,
      }
      itemsToSave.push(item)
    }

    if (itemsToSave.length > 0) {
      await upsertRefillItems(itemsToSave)
    }

    // Reload placements and products after saving
    const [data, prods] = await Promise.all([getRefillData(), getProducts()])
    const flat: Placement[] = []
    for (const [machineId, items] of Object.entries(data)) {
      for (const item of items) {
        flat.push({
          machineId,
          slot: item.slot,
          productCode: item.productCode,
          maxCapacity: item.maxCapacity,
          stockIn: item.stockIn,
          overflow: item.overflow,
          stockOut: item.stockOut,
          currentInventory: item.currentInventory,
        })
      }
    }
    setPlacements(flat)
    setProducts(prods.map((p) => ({ productCode: p.productCode, productName: p.productName, image: p.image })))

    setDrafts({})
    setAdding(false)
    setEditingKey(null)
  }, [drafts, productMap])

  React.useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = handleSaveAll
    }
  }, [handleSaveAll, onSaveRef])

  async function handleDelete(placement: Placement) {
    await deleteRefillItem(placement.machineId, placement.slot)
    setPlacements((prev) =>
      prev.filter((p) => placementKey(p) !== placementKey(placement))
    )
  }

  function startAdd() {
    setAdding(true)
    setEditingKey(null)
    setDrafts({ new: { ...newPlacement, machineId: selectedMachine } })
  }

  function startEdit(key: string) {
    const placement = placements.find(p => placementKey(p) === key)
    if (placement) {
      setEditingKey(key)
      setDrafts({ [key]: { ...placement } })
    }
  }

  function cancelEdit() {
    setEditingKey(null)
    setAdding(false)
    setDrafts({})
  }

  function updateDraft(key: string, placement: Placement) {
    setDrafts((prev) => ({ ...prev, [key]: placement }))
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-card overflow-hidden text-xs">
        <div className="px-4 py-3 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/40">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
              Machine
            </span>
            <select
              value={selectedMachine}
              onChange={(e) => {
                setSelectedMachine(e.target.value)
                setAdding(false)
                setEditingKey(null)
                setNewPlacement((prev) => ({
                  ...prev,
                  machineId: e.target.value,
                }))
              }}
              className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
            >
              {machines.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.value} — {m.label.replace(`${m.value} — `, "")}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!selectedMachine || products.length === 0 || editingKey !== null || adding}
            onClick={startAdd}
          >
            <PlusIcon className="size-3.5" />
            Add Slot
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table className="text-xs min-w-[600px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {["Slot", "Product", "Max Capacity", "Actions"].map((h) => (
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
              {adding && drafts.new && (
                <PlacementEditRow
                  item={drafts.new}
                  products={products}
                  draft={drafts.new}
                  onDraftChange={(p) => updateDraft("new", p)}
                  onCancel={cancelEdit}
                />
              )}
              {visiblePlacements.map((placement) => {
                const key = placementKey(placement)
                const product = productMap.get(placement.productCode)

                if (editingKey === key && drafts[key]) {
                  return (
                    <PlacementEditRow
                      key={key}
                      item={placement}
                      products={products}
                      draft={drafts[key]}
                      onDraftChange={(p) => updateDraft(key, p)}
                      onCancel={cancelEdit}
                    />
                  )
                }

                return (
                  <TableRow key={key} className="h-10">
                    <TableCell className="text-center py-1.5">
                      <span className="font-mono font-bold tracking-wider">
                        {placement.slot}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="mx-auto flex max-w-[240px] items-center gap-2">
                        {product?.image ? (
                          <ImageLightbox
                            src={product.image}
                            alt={product.productName}
                          >
                            <div className="h-7 w-7 rounded-md overflow-hidden border bg-muted shrink-0">
                              <img
                                src={product.image}
                                alt={product.productName}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </ImageLightbox>
                        ) : (
                          <div className="h-7 w-7 rounded-md border bg-muted shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">
                            {product?.productName ?? "Unknown"}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {placement.productCode}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-1.5 text-muted-foreground tabular-nums">
                      {placement.maxCapacity}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => startEdit(key)}
                          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <PencilIcon className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(placement)}
                          className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {selectedMachine &&
                visiblePlacements.length === 0 &&
                !adding && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No products assigned to this machine yet.
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
