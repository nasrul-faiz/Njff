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

export function isRteProduct(type?: ProductType | "") {
  return type === "RTE"
}

export function getAutoStockOutQuantity(item: {
  currentInventory: number
  productType?: ProductType | ""
}) {
  return isRteProduct(item.productType) ? Math.max(0, item.currentInventory) : 0
}