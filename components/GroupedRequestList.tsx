"use client";

import { useMemo, useState } from "react";
import ElapsedBadge from "@/components/ElapsedBadge";
import Modal from "@/components/Modal";
import { fmtDate } from "@/lib/time";
import { deleteRequest, editRequest } from "@/app/actions/requests";
import { useToast } from "@/components/Toast";
import type { Request } from "@/lib/types";

type ItemEntry = {
  itemName: string;
  mostRecent: string;
  oldestSentAt: string;
  uniformAmount: number | null | "mixed";
  anyUrgent: boolean;
  rows: Request[];
};

type PersonGroup = {
  requestorId: string;
  requestorName: string;
  mostRecent: string;
  items: ItemEntry[];
};

function groupByRequestor(requests: Request[]): PersonGroup[] {
  const byPerson = new Map<string, Request[]>();
  for (const r of requests) {
    if (!byPerson.has(r.requested_by_id)) byPerson.set(r.requested_by_id, []);
    byPerson.get(r.requested_by_id)!.push(r);
  }

  const groups: PersonGroup[] = [];
  for (const [personId, personRequests] of byPerson) {
    const byItem = new Map<string, Request[]>();
    for (const r of personRequests) {
      const key = r.item_name.trim().toLowerCase();
      if (!byItem.has(key)) byItem.set(key, []);
      byItem.get(key)!.push(r);
    }

    const items: ItemEntry[] = [];
    for (const rows of byItem.values()) {
      const mostRecent = rows.reduce((mx, r) => (r.sent_at > mx ? r.sent_at : mx), rows[0].sent_at);
      const oldestSentAt = rows.reduce((mn, r) => (r.sent_at < mn ? r.sent_at : mn), rows[0].sent_at);
      const first = rows[0].amount;
      const allSame = rows.every((r) => r.amount === first);
      items.push({
        itemName: rows[0].item_name,
        mostRecent,
        oldestSentAt,
        uniformAmount: allSame ? first : "mixed",
        anyUrgent: rows.some((r) => r.urgent),
        rows,
      });
    }
    items.sort((a, b) => (a.mostRecent < b.mostRecent ? 1 : -1));

    groups.push({
      requestorId: personId,
      requestorName: personRequests[0].requested_by_name,
      mostRecent: items[0].mostRecent,
      items,
    });
  }

  groups.sort((a, b) => (a.mostRecent < b.mostRecent ? 1 : -1));
  return groups;
}

function EditRow({ request, label }: { request: Request; label: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [amountInput, setAmountInput] = useState(String(request.amount ?? ""));
  const [urgentInput, setUrgentInput] = useState(request.urgent);

  async function handleDelete() {
    const result = await deleteRequest(request.id);
    if (result?.error) toast(result.error);
  }

  async function handleSave() {
    const parsed = Number(amountInput);
    const result = await editRequest(request.id, parsed > 0 ? parsed : null, urgentInput);
    if (result?.error) toast(result.error);
    setOpen(false);
  }

  return (
    <>
      <div className="flex items-center gap-3 shrink-0">
        <button
          className="font-mono text-[11px] text-ink-soft underline"
          onClick={() => {
            setAmountInput(String(request.amount ?? ""));
            setUrgentInput(request.urgent);
            setOpen(true);
          }}
          type="button"
        >
          edit
        </button>
        <button className="font-mono text-[11px] text-ink-soft underline" onClick={handleDelete} type="button">
          delete
        </button>
      </div>

      {open && (
        <Modal title="Edit quantity" onCancel={() => setOpen(false)} onConfirm={handleSave} confirmLabel="Save">
          <div className="field mb-3.5">
            <label className="field-label">{label}</label>
            <input
              className="field-input"
              type="number"
              min={1}
              placeholder="No specific amount"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-[13.5px]">
            <input
              type="checkbox"
              className="accent-urgent"
              checked={urgentInput}
              onChange={(e) => setUrgentInput(e.target.checked)}
            />
            Mark as urgent
          </label>
        </Modal>
      )}
    </>
  );
}

function UrgentBadge() {
  return <span className="badge-urgent">Urgent</span>;
}

function ItemCard({ entry }: { entry: ItemEntry }) {
  const single = entry.rows.length === 1;

  return (
    <div className={`chit ${entry.anyUrgent ? "chit-urgent" : ""}`}>
      <div className="flex justify-between items-start gap-2.5">
        <div className="font-bold text-[16px] flex items-center gap-1.5 flex-wrap">
          {entry.itemName}
          {typeof entry.uniformAmount === "number" && (
            <span className="font-mono text-xs font-medium text-ink-soft">×{entry.uniformAmount}</span>
          )}
          {entry.anyUrgent && <UrgentBadge />}
        </div>
        <ElapsedBadge sentAt={entry.oldestSentAt} />
      </div>

      {single ? (
        <div className="mt-2.5 flex justify-between items-center gap-2.5">
          <span className="font-mono text-[11px] text-ink-soft">{fmtDate(entry.rows[0].sent_at)}</span>
          <EditRow request={entry.rows[0]} label={entry.itemName} />
        </div>
      ) : (
        <div className="mt-1">
          {entry.rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2.5 py-2 border-t border-dashed border-line first:border-t-0"
            >
              <div className="font-mono text-[11px] text-ink-soft">
                {fmtDate(r.sent_at)}
                {r.amount ? ` · ×${r.amount}` : ""}
                {r.urgent ? " · urgent" : ""}
              </div>
              <EditRow request={r} label={entry.itemName} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GroupedRequestList({ requests }: { requests: Request[] }) {
  const groups = useMemo(() => groupByRequestor(requests), [requests]);

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 px-5 text-ink-soft">
        <div className="text-3xl mb-2.5">—</div>
        <p className="font-mono text-xs leading-relaxed">
          No requests yet.
          <br />
          Nothing on the rail.
        </p>
      </div>
    );
  }

  return (
    <>
      {groups.map((g) => (
        <div key={g.requestorId} className="mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-dim font-semibold mb-2.5 pt-1">
            {g.requestorName}
          </div>
          {g.items.map((entry) => (
            <ItemCard key={entry.itemName.toLowerCase()} entry={entry} />
          ))}
        </div>
      ))}
    </>
  );
}
