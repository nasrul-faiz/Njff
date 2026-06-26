import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { dbQuery } from "@/lib/db"

export const runtime = "nodejs"

interface RefillHistoryRow {
  id: number
  machine_id: string
  machine_label: string
  date: string
  do_code: string | null
  items: unknown
}

async function ensureRefillHistorySchema() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS refill_history (
      id SERIAL PRIMARY KEY,
      machine_id VARCHAR(50) NOT NULL,
      machine_label VARCHAR(255) NOT NULL,
      date VARCHAR(50) NOT NULL,
      do_code VARCHAR(50),
      items JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_refill_history_machine_date
    ON refill_history(machine_id, date DESC)
  `)
}

export async function GET(request: NextRequest) {
  try {
    await ensureRefillHistorySchema()

    const { searchParams } = new URL(request.url)
    const machineId = searchParams.get("machine_id")

    if (machineId) {
      const result = await dbQuery<RefillHistoryRow>(
        `SELECT id, machine_id, machine_label, date, do_code, items
         FROM refill_history
         WHERE machine_id = $1
         ORDER BY date DESC, id DESC`,
        [machineId]
      )
      return NextResponse.json(result.rows)
    }

    const result = await dbQuery<RefillHistoryRow>(
      `SELECT id, machine_id, machine_label, date, do_code, items
       FROM refill_history
       ORDER BY date DESC, id DESC`
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch refill history"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRefillHistorySchema()

    const payload = await request.json()
    const machineId = payload.machine_id as string | undefined
    const machineLabel = payload.machine_label as string | undefined
    const date = payload.date as string | undefined
    const doCode = (payload.do_code ?? null) as string | null
    const items = payload.items as unknown

    if (!machineId || !machineLabel || !date || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "machine_id, machine_label, date, and items array are required" },
        { status: 400 }
      )
    }

    const result = await dbQuery<RefillHistoryRow>(
      `INSERT INTO refill_history (machine_id, machine_label, date, do_code, items)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, machine_id, machine_label, date, do_code, items`,
      [machineId, machineLabel, date, doCode, JSON.stringify(items)]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save refill history"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
