"use client"

import * as React from "react"
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
  LinkIcon,
  UploadIcon,
} from "lucide-react"
import { getRefillData, upsertRefillItems, deleteRefillItemsByProduct } from "@/lib/refill-store"
import { getProducts } from "@/lib/product-store"
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

const inputCls =
  "w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"

interface EditRowProps {
  item: Product
  draft: Product
  onDraftChange: (product: Product) => void
  onCancel: () => void
}

function EditRow({ item, draft, onDraftChange, onCancel }: EditRowProps) {
  const [imageMode, setImageMode] = React.useState<"url" | "upload">("url")
  const fileRef = React.useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onDraftChange({ ...draft, image: reader.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <TableRow className="bg-accent/20">
      <TableCell className="py-1.5 text-center">
        <input
          className={inputCls}
          value={draft.productCode}
          onChange={(e) => onDraftChange({ ...draft, productCode: e.target.value })}
        />
      </TableCell>
      <TableCell className="py-1.5">
        <div className="flex flex-col gap-1.5">
          <input
            className={inputCls}
            value={draft.productName}
            onChange={(e) => onDraftChange({ ...draft, productName: e.target.value })}
            placeholder="Product name"
          />
          <div className="flex items-center gap-1">
            {draft.image && (
              <div className="relative h-7 w-7 rounded overflow-hidden border bg-muted shrink-0">
                <img
                  src={draft.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="flex gap-1 flex-1">
              <button
                type="button"
                onClick={() => setImageMode("url")}
                className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] border transition-colors ${
                  imageMode === "url"
                    ? "bg-foreground text-background border-foreground"
                    : "text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <LinkIcon className="size-3" /> URL
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageMode("upload")
                  fileRef.current?.click()
                }}
                className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] border transition-colors ${
                  imageMode === "upload"
                    ? "bg-foreground text-background border-foreground"
                    : "text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <UploadIcon className="size-3" /> Upload
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </div>
          {imageMode === "url" && (
            <input
              className={inputCls}
              value={draft.image}
              onChange={(e) => onDraftChange({ ...draft, image: e.target.value })}
              placeholder="https://..."
            />
          )}
        </div>
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

interface EditProductsContentProps {
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>
}

export function EditProductsContent({ onSaveRef }: EditProductsContentProps) {
  const [products, setProducts] = React.useState<Product[]>([])
  const [allItems, setAllItems] = React.useState<Array<RefillItem & { machine_id: string }>>([])
  const [drafts, setDrafts] = React.useState<Record<string, Product>>({})
  const [loading, setLoading] = React.useState(true)
  const [editingCode, setEditingCode] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [newProduct, setNewProduct] = React.useState<Product>({
    productCode: "",
    productName: "",
    image: "",
  })

  React.useEffect(() => {
    Promise.all([getRefillData(), getProducts()]).then(([data, prods]) => {
      const flat: Array<RefillItem & { machine_id: string }> = []
      for (const [machineId, items] of Object.entries(data)) {
        for (const item of items) {
          flat.push({ ...item, machine_id: machineId })
        }
      }
      setAllItems(flat)
      setProducts(prods.map((p) => ({ productCode: p.productCode, productName: p.productName, image: p.image })))
      setLoading(false)
    })
  }, [])

  const handleSaveAll = React.useCallback(async () => {
    const itemsToUpdate: Array<RefillItem & { machine_id: string }> = []
    const newProductsToAdd: Product[] = []

    for (const [code, draft] of Object.entries(drafts)) {
      const finalCode = draft.productCode.trim().toUpperCase()
      if (!finalCode || !draft.productName.trim()) continue

      if (code === "new") {
        // New product — add to the products master via API
        newProductsToAdd.push({
          productCode: finalCode,
          productName: draft.productName.trim(),
          image: draft.image.trim(),
        })
        continue
      }

      // Existing product edit — update all refill items that use this product code
      const affected = allItems.filter((i) => i.productCode === code)
      if (affected.length > 0) {
        const updated = affected.map((i) => ({
          ...i,
          productCode: finalCode,
          productName: draft.productName.trim(),
          image: draft.image.trim(),
        }))
        itemsToUpdate.push(...updated)
      }
    }

    if (itemsToUpdate.length > 0) {
      await upsertRefillItems(itemsToUpdate)
      // Merge updates back into allItems, preserving items that weren't edited
      setAllItems((prev) => {
        const updatedKeys = new Set(itemsToUpdate.map((i) => `${i.machine_id}::${i.slot}`))
        const unchanged = prev.filter((i) => !updatedKeys.has(`${i.machine_id}::${i.slot}`))
        return [...unchanged, ...itemsToUpdate]
      })
    }

    if (newProductsToAdd.length > 0) {
      for (const p of newProductsToAdd) {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_code: p.productCode,
            product_name: p.productName,
            image: p.image,
          }),
        })
      }
      setProducts((prev) => {
        const existing = new Set(prev.map((p) => p.productCode))
        return [...prev, ...newProductsToAdd.filter((p) => !existing.has(p.productCode))]
      })
    }

    // Reflect product edits in the products list
    if (itemsToUpdate.length > 0) {
      setProducts((prev) => {
        const updated = new Map(prev.map((p) => [p.productCode, p]))
        for (const [code, draft] of Object.entries(drafts)) {
          if (code === "new") continue
          const finalCode = draft.productCode.trim().toUpperCase()
          if (!finalCode) continue
          updated.delete(code)
          updated.set(finalCode, {
            productCode: finalCode,
            productName: draft.productName.trim(),
            image: draft.image.trim(),
          })
        }
        return Array.from(updated.values())
      })
    }

    setDrafts({})
    setAdding(false)
    setEditingCode(null)
  }, [drafts, allItems])

  React.useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = handleSaveAll
    }
  }, [handleSaveAll, onSaveRef])

  async function handleDelete(productCode: string) {
    await deleteRefillItemsByProduct(productCode)
    setProducts((prev) => prev.filter((p) => p.productCode !== productCode))
    setAllItems((prev) => prev.filter((i) => i.productCode !== productCode))
  }

  function startAdd() {
    setAdding(true)
    setEditingCode(null)
    setDrafts({ new: { productCode: "", productName: "", image: "" } })
  }

  function startEdit(code: string) {
    const product = products.find((p) => p.productCode === code)
    if (product) {
      setEditingCode(code)
      setDrafts({ [code]: { ...product } })
    }
  }

  function cancelEdit() {
    setEditingCode(null)
    setAdding(false)
    setDrafts({})
  }

  function updateDraft(code: string, product: Product) {
    setDrafts((prev) => ({ ...prev, [code]: product }))
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {products.length} product{products.length !== 1 && "s"} in master list
        </p>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={startAdd}
          disabled={editingCode !== null || adding}
        >
          <PlusIcon className="size-3.5" />
          Add Product
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden text-xs">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Code", "Product Name / Image", "Actions"].map((h) => (
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
              <EditRow
                item={drafts.new}
                draft={drafts.new}
                onDraftChange={(p) => updateDraft("new", p)}
                onCancel={cancelEdit}
              />
            )}
            {products.map((item) => {
              if (editingCode === item.productCode && drafts[item.productCode]) {
                return (
                  <EditRow
                    key={item.productCode}
                    item={item}
                    draft={drafts[item.productCode]}
                    onDraftChange={(p) => updateDraft(item.productCode, p)}
                    onCancel={cancelEdit}
                  />
                )
              }
              return (
                <TableRow key={item.productCode} className="h-10">
                  <TableCell className="text-center py-1.5 text-muted-foreground font-mono">
                    {item.productCode}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex items-center gap-2">
                      {item.image ? (
                        <ImageLightbox src={item.image} alt={item.productName}>
                          <div className="h-7 w-7 rounded-md overflow-hidden border bg-muted shrink-0">
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </ImageLightbox>
                      ) : (
                        <div className="h-7 w-7 rounded-md border bg-muted shrink-0" />
                      )}
                      <span className="font-medium truncate max-w-[200px]">
                        {item.productName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => startEdit(item.productCode)}
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.productCode)}
                        className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {products.length === 0 && !adding && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-10 text-center text-muted-foreground"
                >
                  No products yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
