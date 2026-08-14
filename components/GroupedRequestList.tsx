"use client";

import { useMemo, useState } from "react";
import ElapsedBadge from "@/components/ElapsedBadge";
import Modal from "@/components/Modal";
import { fmtDate } from "@/lib/time";
import { deleteRequest, editRequestAmount } from "@/app/actions/requests";
import { useToast } from "@/components/Toast";
import type { Request } from "@/lib/types";

type Group = {
  itemName: string;
  oldestSentAt: string;
  uniformAmount: number | null | "mixed";
  requests: Request[];
};

function groupRequests(requests: Request[]): Group[] {
  const byName = new Map<string, Request[]>();
  for (const r of requests) {
    const key = r.item_name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(r);
  }

  const groups: Group[] = [];
  for (const list of byName.values()) {
    const oldestSentAt = list.reduce(
      (oldest, r) => (r.sent_at < oldest ? r.sent_at : oldest),
      list[0].sent_at
    );
    const first = list[0].amount;
    const allSame = list.every((r) => r.amount === first);
    groups.push({
      itemName: list[0].item_name,
      oldestSentAt,
      uniformAmount: allSame ? first : "mixed",
      requests: list,
    });
  }

  return groups.sort((a, b) => (a.oldestSentAt < b.oldestSentAt ? -1 : 1));
}

function RequesterRow({ request, showAmount }: { request: Request; showAmount: boolean }) {
  const toast = useToast();
  const [amountEditOpen, setAmountEditOpen] = useState(false);
  const [amountInput, setAmountInput] = useState(String(request.amount ?? ""));

  async function handleDelete() {
    const result = await deleteRequest(request.id);
    if (result?.error) toast(result.error);
  }

  async function handleSaveAmount() {
    const parsed = Number(amountInput);
    const result = await editRequestAmount(request.id, parsed > 0 ? parsed : null);
    if (result?.error) toast(result.error);
    setAmountEditOpen(false);
  }

  return (
    <div className="flex items-center justify-between gap-2.5 py-2.5 border-t border-dashed border-line first:border-t-0">
      <div className="min-w-0">
        <span className="text-[13.5px] font-semibold">{request.requested_by_name}</span>
        {showAmount && (
          <span className="font-mono text-[11px] text-ink-soft"> ×{request.amount ?? "—"}</span>
        )}
        <div className="font-mono text-[10.5px] text-ink-soft mt-0.5">{fmtDate(request.sent_at)}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          className="font-mono text-[11px] text-ink-soft underline"
          onClick={() => {
            setAmountInput(String(request.amount ?? ""));
            setAmountEditOpen(true);
          }}
          type="button"
        >
          edit
        </button>
        <button
          className="font-mono text-[11px] text-ink-soft underline"
          onClick={handleDelete}
          type="button"
        >
          delete
        </button>
      </div>

      {amountEditOpen && (
        <Modal
          title="Edit quantity"
          onCancel={() => setAmountEditOpen(false)}
          onConfirm={handleSaveAmount}
          confirmLabel="Save"
        >
          <div className="field">
            <label className="field-label">
              {request.item_name} — {request.requested_by_name}
            </label>
            <input
              className="field-input"
              type="number"
              min={1}
              placeholder="No specific amount"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function GroupedRequestList({ requests }: { requests: Request[] }) {
  const groups = useMemo(() => groupRequests(requests), [requests]);

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
        <div key={g.itemName.toLowerCase()} className="chit">
          <div className="flex justify-between items-start gap-2.5">
            <div className="font-bold text-[16px]">
              {g.itemName}
              {typeof g.uniformAmount === "number" && (
                <span className="font-mono text-xs font-medium text-ink-soft"> ×{g.uniformAmount}</span>
              )}
              {g.requests.length > 1 && (
                <span className="font-mono text-[10.5px] text-ink-soft ml-1.5">
                  ({g.requests.length} requests)
                </span>
              )}
            </div>
            <ElapsedBadge sentAt={g.oldestSentAt} />
          </div>
          <div className="mt-1">
            {g.requests.map((r) => (
              <RequesterRow key={r.id} request={r} showAmount={g.uniformAmount === "mixed"} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
