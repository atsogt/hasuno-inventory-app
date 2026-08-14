"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import {
  submitRequest,
  requestAgain,
  addItemToCatalog,
  saveItemEdit,
  removeItemFromCatalog,
} from "@/app/actions/requests";
import { dismissStaffReminder } from "@/app/actions/reminders";
import type { Item, Request, Station, StaffReminder } from "@/lib/types";

const STATIONS: Station[] = ["Sushi", "Kitchen"];
const FAB_RIGHT = "max(1.25rem, calc(50% - 240px + 1.25rem))";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
      {children}
    </h2>
  );
}

export default function RequestScreen({
  items,
  canManageCatalog,
  activeReminders,
  myOpenRequests,
}: {
  items: Item[];
  canManageCatalog: boolean;
  activeReminders: StaffReminder[];
  myOpenRequests: Request[];
}) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState<Station | "All">("All");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [otherItem, setOtherItem] = useState("");

  const [duplicate, setDuplicate] = useState<Request | null>(null);
  const [dupAmount, setDupAmount] = useState("1");
  const [dupUrgent, setDupUrgent] = useState(false);

  const myOpenByName = useMemo(() => {
    const map = new Map<string, Request>();
    for (const r of myOpenRequests) map.set(r.item_name.trim().toLowerCase(), r);
    return map;
  }, [myOpenRequests]);

  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("1");
  const [newItemStation, setNewItemStation] = useState<Station>("Sushi");
  const [newItemCategory, setNewItemCategory] = useState("");

  const [editing, setEditing] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("1");
  const [editStation, setEditStation] = useState<Station>("Sushi");
  const [editCategory, setEditCategory] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const [collapsedStations, setCollapsedStations] = useState<Set<Station>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  function toggleStation(station: Station) {
    setCollapsedStations((prev) => {
      const next = new Set(prev);
      next.has(station) ? next.delete(station) : next.add(station);
      return next;
    });
  }

  function toggleCategory(key: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const categoriesByStation = useMemo(() => {
    const map: Record<Station, string[]> = { Sushi: [], Kitchen: [] };
    for (const item of items) {
      if (!map[item.station].includes(item.category)) map[item.station].push(item.category);
    }
    return map;
  }, [items]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (stationFilter !== "All" && item.station !== stationFilter) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });

    const byStation = new Map<Station, Map<string, Item[]>>();
    for (const item of filtered) {
      if (!byStation.has(item.station)) byStation.set(item.station, new Map());
      const byCategory = byStation.get(item.station)!;
      if (!byCategory.has(item.category)) byCategory.set(item.category, []);
      byCategory.get(item.category)!.push(item);
    }
    return byStation;
  }, [items, search, stationFilter]);

  async function requestItem(item: Item) {
    const existing = myOpenByName.get(item.name.trim().toLowerCase());
    if (existing) {
      setDuplicate(existing);
      setDupAmount(String(existing.amount ?? item.amount ?? ""));
      setDupUrgent(existing.urgent);
      return;
    }
    const result = await submitRequest(item.name, item.amount);
    if (result?.error) toast(result.error);
    else toast(`Request sent: ${result.label}`);
  }

  async function sendOther() {
    const name = otherItem.trim();
    if (!name) return;
    const existing = myOpenByName.get(name.toLowerCase());
    if (existing) {
      setDuplicate(existing);
      setDupAmount(String(existing.amount ?? ""));
      setDupUrgent(existing.urgent);
      setQuickAddOpen(false);
      return;
    }
    const result = await submitRequest(name, null);
    if (result?.error) toast(result.error);
    else {
      toast(`Request sent: ${result.label}`);
      setOtherItem("");
      setQuickAddOpen(false);
    }
  }

  async function confirmRequestAgain() {
    if (!duplicate) return;
    const parsed = Number(dupAmount);
    const result = await requestAgain(duplicate.id, parsed > 0 ? parsed : null, dupUrgent);
    if (result?.error) toast(result.error);
    else toast(`Updated your request for ${duplicate.item_name}`);
    setDuplicate(null);
  }

  async function createItem() {
    const result = await addItemToCatalog(
      newItemName,
      Number(newItemAmount) || 1,
      newItemStation,
      newItemCategory
    );
    if (result?.error) toast(result.error);
    else {
      toast(`Added "${newItemName.trim()}" to the item list`);
      setNewItemName("");
      setNewItemAmount("1");
      setNewItemCategory("");
      setQuickAddOpen(false);
    }
  }

  function openEdit(item: Item) {
    setEditing(item);
    setEditName(item.name);
    setEditAmount(String(item.amount));
    setEditStation(item.station);
    setEditCategory(item.category);
  }

  async function saveEdit() {
    if (!editing) return;
    const result = await saveItemEdit(
      editing.id,
      editName,
      Number(editAmount) || 1,
      editStation,
      editCategory
    );
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
  const stationsToRender = STATIONS.filter((s) => grouped.has(s));
  const resultCount = [...grouped.values()].reduce(
    (n, cats) => n + [...cats.values()].reduce((m, list) => m + list.length, 0),
    0
  );

  return (
    <>
      {visibleReminders.map((r) => (
        <div
          key={r.id}
          className="flex items-start gap-2.5 bg-accent/10 border border-accent rounded-xl p-3.5 mb-5"
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

      <SectionLabel>Request Item</SectionLabel>

      <div className="mb-5 space-y-2.5">
        <input
          className="field-input"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1.5">
          {(["All", ...STATIONS] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStationFilter(s)}
              className={`flex-1 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-wide border transition-colors ${
                stationFilter === s
                  ? "bg-ink text-paper border-ink"
                  : "bg-card text-ink-soft border-line active:bg-paper-dim"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {resultCount === 0 && (
        <p className="font-mono text-xs text-ink-soft text-center py-6">
          No items match &quot;{search}&quot;.
        </p>
      )}

      {stationsToRender.map((station) => {
        const stationCollapsed = collapsedStations.has(station);
        return (
          <div key={station} className="mb-2">
            <button
              type="button"
              onClick={() => toggleStation(station)}
              className="w-full flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-dim font-semibold mb-3 pt-1"
            >
              <span className={`transition-transform ${stationCollapsed ? "" : "rotate-90"}`}>▸</span>
              {station}
            </button>
            {!stationCollapsed &&
              [...grouped.get(station)!.entries()].map(([category, categoryItems]) => {
                const key = `${station}|${category}`;
                const categoryCollapsed = collapsedCategories.has(key);
                return (
                  <div key={category} className="mb-6">
                    <button
                      type="button"
                      onClick={() => toggleCategory(key)}
                      className="w-full flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2.5 pl-0.5"
                    >
                      <span className={`transition-transform text-[9px] ${categoryCollapsed ? "" : "rotate-90"}`}>▸</span>
                      {category}
                    </button>
                    {!categoryCollapsed && (
                      <div className="grid grid-cols-2 gap-2.5">
                        {categoryItems.map((item) => (
                          <div key={item.id} className="flex flex-col">
                            <button
                              className="relative bg-card border border-line rounded-[10px] px-2.5 py-4 text-left flex flex-col gap-1 w-full active:bg-paper-dim active:scale-[0.98]"
                              onClick={() => requestItem(item)}
                              type="button"
                            >
                              {item.is_prep && (
                                <span className="absolute top-2 right-2 font-mono text-[8.5px] uppercase tracking-wide text-gold bg-paper-dim px-1.5 py-0.5 rounded-full">
                                  House-made
                                </span>
                              )}
                              <span className="font-bold text-[15px] pr-14">{item.name}</span>
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
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        aria-label="Quick add"
        style={{ right: FAB_RIGHT }}
        className="fixed bottom-24 z-10 w-14 h-14 rounded-full bg-urgent text-white text-3xl leading-none font-light flex items-center justify-center shadow-[0_6px_20px_rgba(178,58,46,0.4)] border-2 border-paper transition-transform hover:scale-105 hover:rotate-90 active:scale-95 motion-reduce:transition-none motion-reduce:hover:rotate-0"
      >
        <span className="-translate-y-[1px]">+</span>
      </button>

      {quickAddOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-20"
          onClick={() => setQuickAddOpen(false)}
        >
          <div
            className="bg-paper w-full max-w-[480px] rounded-t-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            style={{ paddingBottom: "calc(22px + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="m-0 text-[17px] font-bold">Quick Add</h3>
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                aria-label="Close"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-paper-dim text-ink-soft text-sm"
              >
                ✕
              </button>
            </div>

            <label className="field-label">Request something else</label>
            <div className="flex gap-2 mb-2">
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

            {canManageCatalog && (
              <>
                <div className="border-t border-dashed border-line my-5" />
                <label className="field-label">Add to catalog</label>
                <div className="field mb-3">
                  <input
                    className="field-input"
                    placeholder="Item name, e.g. Sesame Oil"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <select
                    className="field-input"
                    value={newItemStation}
                    onChange={(e) => setNewItemStation(e.target.value as Station)}
                  >
                    {STATIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field-input"
                    type="number"
                    min={1}
                    placeholder="Qty to get"
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                  />
                </div>
                <div className="field mb-4">
                  <input
                    className="field-input"
                    list="new-item-categories"
                    placeholder="Category, e.g. Sauces"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                  />
                  <datalist id="new-item-categories">
                    {categoriesByStation[newItemStation].map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <button className="btn btn-primary w-full" onClick={createItem} type="button">
                  Create item
                </button>
              </>
            )}
          </div>
        </div>
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
          <div className="grid grid-cols-2 gap-2.5 mb-3.5">
            <div className="field">
              <label className="field-label">Station</label>
              <select
                className="field-input"
                value={editStation}
                onChange={(e) => setEditStation(e.target.value as Station)}
              >
                {STATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Amount to get</label>
              <input
                className="field-input"
                type="number"
                min={1}
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="field mb-3.5">
            <label className="field-label">Category</label>
            <input
              className="field-input"
              list="edit-item-categories"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
            />
            <datalist id="edit-item-categories">
              {categoriesByStation[editStation].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <button
            className="font-mono text-[11px] text-urgent underline"
            onClick={() => setConfirmDelete(editing)}
            type="button"
          >
            Remove item from list
          </button>
        </Modal>
      )}

      {duplicate && (
        <Modal
          title="Already on your list"
          onCancel={() => setDuplicate(null)}
          onConfirm={confirmRequestAgain}
          confirmLabel="Update request"
        >
          <p className="text-[13.5px] text-ink-soft leading-relaxed mb-4">
            You already have an open request for <b className="text-ink">{duplicate.item_name}</b>. Update
            the quantity or mark it urgent instead of sending a duplicate.
          </p>
          <div className="field mb-3.5">
            <label className="field-label">Quantity</label>
            <input
              className="field-input"
              type="number"
              min={1}
              placeholder="No specific amount"
              value={dupAmount}
              onChange={(e) => setDupAmount(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-[13.5px]">
            <input
              type="checkbox"
              className="accent-urgent"
              checked={dupUrgent}
              onChange={(e) => setDupUrgent(e.target.checked)}
            />
            Mark as urgent
          </label>
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
