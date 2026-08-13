"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import {
  submitRequest,
  addItemToCatalog,
  saveItemEdit,
  removeItemFromCatalog,
} from "@/app/actions/requests";
import { dismissStaffReminder } from "@/app/actions/reminders";
import type { Item, StaffReminder } from "@/lib/types";

export default function RequestScreen({
  items,
  canManageCatalog,
  activeReminders,
}: {
  items: Item[];
  canManageCatalog: boolean;
  activeReminders: StaffReminder[];
}) {
  const toast = useToast();
  const [otherItem, setOtherItem] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("1");
  const [editing, setEditing] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("1");
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  async function requestItem(item: Item) {
    const result = await submitRequest(item.name, item.amount);
    if (result?.error) toast(result.error);
    else toast(`Request sent: ${result.label}`);
  }

  async function sendOther() {
    if (!otherItem.trim()) return;
    const result = await submitRequest(otherItem, null);
    if (result?.error) toast(result.error);
    else {
      toast(`Request sent: ${result.label}`);
      setOtherItem("");
    }
  }

  async function createItem() {
    const result = await addItemToCatalog(newItemName, Number(newItemAmount) || 1);
    if (result?.error) toast(result.error);
    else {
      toast(`Added "${newItemName.trim()}" to the item list`);
      setNewItemName("");
      setNewItemAmount("1");
    }
  }

  function openEdit(item: Item) {
    setEditing(item);
    setEditName(item.name);
    setEditAmount(String(item.amount));
  }

  async function saveEdit() {
    if (!editing) return;
    const result = await saveItemEdit(editing.id, editName, Number(editAmount) || 1);
    if (result?.error) toast(result.error);
    else {
      toast(`Saved changes to "${editName.trim()}"`);
      setEditing(null);
    }
  }

  async function confirmRemove() {
    if (!confirmDelete) return;
    const result = await removeItemFromCatalog(confirmDelete.id);
    if (result?.error) toast(result.error);
    else toast(`Removed "${confirmDelete.name}" from the item list`);
    setConfirmDelete(null);
    setEditing(null);
  }

  async function dismiss(id: string) {
    setDismissed((d) => [...d, id]);
    await dismissStaffReminder(id);
  }

  const visibleReminders = activeReminders.filter((r) => !dismissed.includes(r.id));

  return (
    <>
      {visibleReminders.map((r) => (
        <div
          key={r.id}
          className="flex items-start gap-2.5 bg-[#FBEFE9] border border-accent rounded-xl p-3.5 mb-5"
        >
          <div className="text-lg leading-none">⏰</div>
          <div className="flex-1">
            <div className="font-bold text-[13px] text-accent-dim">
              Reminder from {r.created_by_name}
            </div>
            <div className="text-[13.5px] mt-1 leading-snug">{r.message}</div>
          </div>
          <button
            className="font-mono text-[10.5px] text-accent underline whitespace-nowrap"
            onClick={() => dismiss(r.id)}
            type="button"
          >
            Dismiss
          </button>
        </div>
      ))}

      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
        Request Item
      </h2>
      <div className="grid grid-cols-2 gap-2.5 mb-5.5">
        {items.map((item, i) => (
          <div key={item.id} className="flex flex-col">
            <button
              className="bg-card border border-line rounded-[10px] px-2.5 py-4 text-left flex flex-col gap-1 w-full active:bg-paper-dim active:scale-[0.98]"
              onClick={() => requestItem(item)}
              type="button"
            >
              <span className="font-mono text-[10px] text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-bold text-[15px]">{item.name}</span>
              <span className="font-mono text-[10.5px] text-ink-soft">Qty: {item.amount}</span>
            </button>
            {canManageCatalog && (
              <button
                className="self-end font-mono text-[10px] text-ink-soft underline py-1.5 px-0.5"
                onClick={() => openEdit(item)}
                type="button"
              >
                edit
              </button>
            )}
          </div>
        ))}
      </div>

      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
        Other
      </h2>
      <div className="panel-card">
        <div className="flex gap-2">
          <input
            className="field-input flex-1"
            placeholder="Type item name…"
            value={otherItem}
            onChange={(e) => setOtherItem(e.target.value)}
          />
          <button className="btn btn-accent" onClick={sendOther} type="button">
            Send
          </button>
        </div>
      </div>

      {canManageCatalog && (
        <>
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
            Create New Item
          </h2>
          <div className="panel-card">
            <div className="field mb-3.5">
              <label className="field-label">Item name</label>
              <input
                className="field-input"
                placeholder="e.g. Sesame Oil"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
            </div>
            <div className="field mb-4">
              <label className="field-label">Amount to get</label>
              <input
                className="field-input"
                type="number"
                min={1}
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
              />
            </div>
            <button className="btn btn-primary w-full" onClick={createItem} type="button">
              Create item
            </button>
          </div>
        </>
      )}

      {editing && (
        <Modal
          title="Edit item"
          onCancel={() => setEditing(null)}
          onConfirm={saveEdit}
          confirmLabel="Save"
        >
          <div className="field mb-3.5">
            <label className="field-label">Name</label>
            <input className="field-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="field mb-3.5">
            <label className="field-label">Amount to get</label>
            <input
              className="field-input"
              type="number"
              min={1}
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
          </div>
          <button
            className="font-mono text-[11px] text-accent underline"
            onClick={() => setConfirmDelete(editing)}
            type="button"
          >
            Remove item from list
          </button>
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title="Remove item?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmRemove}
          confirmLabel="Remove"
          danger
        >
          <p className="text-[13.5px] text-ink-soft">
            Remove &quot;{confirmDelete.name}&quot; from the item list? This won&apos;t affect past requests.
          </p>
        </Modal>
      )}
    </>
  );
}
