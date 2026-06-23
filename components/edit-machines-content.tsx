"use client"

import * as React from "react"
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  CheckIcon,
  XIcon,
} from "lucide-react"
import {
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  type Machine,
} from "@/lib/machine-store"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

const inputCls =
  "w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"

interface MachineEditRowProps {
  machine: Machine
  draftKey: string
  draft: Machine
  onDraftChange: (machine: Machine) => void
  onCancel: () => void
}

function MachineEditRow({ machine, draft, onDraftChange, onCancel }: MachineEditRowProps) {
  return (
    <TableRow className="bg-accent/20">
      <TableCell className="py-1.5 px-4">
        <input
          className={inputCls}
          value={draft.value}
          onChange={(e) =>
            onDraftChange({ ...draft, value: e.target.value.toUpperCase() })
          }
          placeholder="M0001"
        />
      </TableCell>
      <TableCell className="py-1.5 px-4">
        <input
          className={inputCls}
          value={draft.label}
          onChange={(e) =>
            onDraftChange({ ...draft, label: e.target.value })
          }
          placeholder="M0001 — Location name"
        />
      </TableCell>
      <TableCell className="py-1.5 px-4">
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

interface EditMachinesContentProps {
  onSaveRef?: React.MutableRefObject<(() => Promise<void>) | null>
}

export function EditMachinesContent({ onSaveRef }: EditMachinesContentProps) {
  const [machines, setMachines] = React.useState<Machine[]>([])
  const [drafts, setDrafts] = React.useState<Record<string, Machine>>({})
  const [loading, setLoading] = React.useState(true)
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [newMachine, setNewMachine] = React.useState<Machine>({
    value: "",
    label: "",
  })

  React.useEffect(() => {
    getMachines().then((m) => {
      setMachines(m)
      setLoading(false)
    })
  }, [])

  const handleSaveAll = React.useCallback(async () => {
    // Save all drafts
    for (const [key, draft] of Object.entries(drafts)) {
      const value = draft.value.trim().toUpperCase()
      if (!value) continue

      if (key === "new") {
        // New machine
        if (machines.some((m) => m.value === value)) continue
        const created = await createMachine({
          value,
          label: draft.label.trim() || value,
        })
        if (created) {
          setMachines((prev) => [...prev, created])
        }
      } else {
        // Existing machine
        if (draft.id && machines.some((m) => m.value === value && m.id !== draft.id)) continue
        const updated = await updateMachine({
          ...draft,
          value,
          label: draft.label.trim() || value,
        })
        if (updated) {
          setMachines((prev) =>
            prev.map((m) => (m.id === draft.id ? updated : m))
          )
        }
      }
    }

    // Clear drafts and reset UI
    setDrafts({})
    setAdding(false)
    setEditingId(null)
    setNewMachine({ value: "", label: "" })
  }, [drafts, machines])

  React.useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = handleSaveAll
    }
  }, [handleSaveAll, onSaveRef])

  function startAdd() {
    setAdding(true)
    setEditingId(null)
    setDrafts({ new: { value: "", label: "" } })
  }

  function startEdit(id: number | undefined) {
    if (id === undefined) return
    const machine = machines.find((m) => m.id === id)
    if (machine) {
      setEditingId(id)
      setDrafts({ [`${id}`]: { ...machine } })
    }
  }

  function cancelEdit() {
    setEditingId(null)
    setAdding(false)
    setDrafts({})
    setNewMachine({ value: "", label: "" })
  }

  function updateDraft(key: string, machine: Machine) {
    setDrafts((prev) => ({ ...prev, [key]: machine }))
  }

  async function handleDelete(machine: Machine) {
    if (!machine.id) return
    const ok = await deleteMachine(machine.id)
    if (ok) setMachines((prev) => prev.filter((m) => m.id !== machine.id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {machines.length} machine{machines.length !== 1 && "s"}
        </p>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={startAdd}
          disabled={editingId !== null || adding}
        >
          <PlusIcon className="size-3.5" />
          Add Machine
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <Table className="text-xs min-w-[500px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {["Machine ID", "Label / Location", "Actions"].map((h) => (
                  <TableHead
                    key={h}
                    className="text-[11px] font-semibold tracking-wide py-2 px-4"
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {adding && drafts.new && (
                <MachineEditRow
                  machine={{ value: "", label: "" }}
                  draftKey="new"
                  draft={drafts.new}
                  onDraftChange={(m) => updateDraft("new", m)}
                  onCancel={cancelEdit}
                />
              )}
              {machines.map((machine) => {
                const draftKey = `${machine.id}`
                const isEditing = editingId === machine.id
                if (isEditing && drafts[draftKey]) {
                  return (
                    <MachineEditRow
                      key={machine.id}
                      machine={machine}
                      draftKey={draftKey}
                      draft={drafts[draftKey]}
                      onDraftChange={(m) => updateDraft(draftKey, m)}
                      onCancel={cancelEdit}
                    />
                  )
                }
                return (
                  <TableRow key={machine.id ?? machine.value} className="h-10">
                    <TableCell className="py-1.5 px-4">
                      <span className="font-mono font-bold tracking-wider">
                        {machine.value}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 px-4 text-muted-foreground">
                      {machine.label}
                    </TableCell>
                    <TableCell className="py-1.5 px-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(machine.id)}
                          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <PencilIcon className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(machine)}
                          className="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {machines.length === 0 && !adding && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No machines yet. Add one to get started.
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
