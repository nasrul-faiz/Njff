import type { ProductType } from "@/lib/product-store"

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

export const STOCK_IN_COLORS = ["#3B82F6", "#F97316", "#92400E", "#22C55E", "#A855F7", "#EC4899", "#EAB308"]
export const MOVE_FRONT_COLORS = ["#EAB308", "#3B82F6", "#F97316", "#92400E", "#22C55E", "#A855F7", "#EC4899"]
export const EXPIRED_COLORS = ["#EC4899", "#EAB308", "#3B82F6", "#F97316", "#92400E", "#22C55E", "#A855F7"]

export const COLOR_LABELS = [
  { color: "#3B82F6", label: "Blue" },
  { color: "#F97316", label: "Orange" },
  { color: "#92400E", label: "Brown" },
  { color: "#22C55E", label: "Green" },
  { color: "#A855F7", label: "Purple" },
  { color: "#EC4899", label: "Pink" },
  { color: "#EAB308", label: "Yellow" },
] as const

export type BatchInventory = Record<string, number>

function toSafeInteger(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

export function normalizeBatchInventory(batchInventory?: Record<string, unknown> | null): BatchInventory {
  if (!batchInventory || typeof batchInventory !== "object") return {}

  const normalized: BatchInventory = {}
  for (const [color, qty] of Object.entries(batchInventory)) {
    const safeQty = toSafeInteger(qty)
    if (safeQty > 0) {
      normalized[color] = safeQty
    }
  }

  return normalized
}

export function getTodayExpiredIndex(date = new Date()) {
  return (date.getDay() + 6) % 7
}

export function getTodayExpiredInfo(date = new Date()) {
  const index = getTodayExpiredIndex(date)
  const color = EXPIRED_COLORS[index]
  const match = COLOR_LABELS.find((item) => item.color === color)

  return {
    index,
    day: DAYS[index],
    color,
    label: match?.label ?? color,
  }
}

export function getTodayStockInColor(date = new Date()) {
  return STOCK_IN_COLORS[getTodayExpiredIndex(date)]
}

export function getTodayExpiredColor(date = new Date()) {
  return EXPIRED_COLORS[getTodayExpiredIndex(date)]
}

export function isRteProduct(type?: ProductType | "") {
  return type === "RTE"
}

export function getAutoStockOutQuantity(item: {
  currentInventory: number
  productType?: ProductType | ""
  batchInventory?: Record<string, unknown> | null
}, date = new Date()) {
  if (!isRteProduct(item.productType)) return 0

  const batchInventory = normalizeBatchInventory(item.batchInventory)
  if (Object.keys(batchInventory).length === 0) {
    return Math.max(0, item.currentInventory)
  }

  return batchInventory[getTodayExpiredColor(date)] ?? 0
}

export function getSellableInventoryQuantity(item: {
  currentInventory: number
  productType?: ProductType | ""
  batchInventory?: Record<string, unknown> | null
}, date = new Date()) {
  if (!isRteProduct(item.productType)) {
    return Math.max(0, item.currentInventory)
  }

  const batchInventory = normalizeBatchInventory(item.batchInventory)
  if (Object.keys(batchInventory).length === 0) {
    return Math.max(0, item.currentInventory)
  }

  const expiredColor = getTodayExpiredColor(date)
  const total = Object.values(batchInventory).reduce((sum, qty) => sum + qty, 0)
  const expiredQty = batchInventory[expiredColor] ?? 0

  return Math.max(0, total - expiredQty)
}