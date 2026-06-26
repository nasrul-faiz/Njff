import type { RefillItem } from "@/components/refill-table"

export interface RefillHistoryItem extends RefillItem {}

export interface RefillHistoryEntry {
  id: number
  machineId: string
  machineLabel: string
  date: string
  doCode: string | null
  items: RefillHistoryItem[]
}

interface SaveRefillHistoryPayload {
  machineId: string
  machineLabel: string
  date: string
  doCode: string | null
  items: RefillHistoryItem[]
}

export async function getRefillHistory(machineId?: string): Promise<RefillHistoryEntry[]> {
  try {
    const query = machineId
      ? `?machine_id=${encodeURIComponent(machineId)}`
      : ""

    const response = await fetch(`/api/refill-history${query}`, {
      cache: "no-store",
    })

    if (!response.ok) throw new Error("Failed to fetch refill history")

    const data = await response.json()
    return data.map((entry: any) => ({
      id: entry.id,
      machineId: entry.machine_id,
      machineLabel: entry.machine_label,
      date: entry.date,
      doCode: entry.do_code ?? null,
      items: (entry.items ?? []) as RefillHistoryItem[],
    }))
  } catch (error) {
    console.error("Error fetching refill history:", error)
    return []
  }
}

export async function saveRefillHistory(
  payload: SaveRefillHistoryPayload
): Promise<boolean> {
  try {
    const response = await fetch("/api/refill-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machine_id: payload.machineId,
        machine_label: payload.machineLabel,
        date: payload.date,
        do_code: payload.doCode,
        items: payload.items,
      }),
    })

    if (!response.ok) throw new Error("Failed to save refill history")
    return true
  } catch (error) {
    console.error("Error saving refill history:", error)
    return false
  }
}
