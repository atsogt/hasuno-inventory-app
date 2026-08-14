"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { fmtDate } from "@/lib/time";
import { clearReminderHistory } from "@/app/actions/reminders";
import type { Profile, ReminderHistoryEntry } from "@/lib/types";

export default function ReminderHistoryButton({
  accounts,
  history,
}: {
  accounts: Profile[];
  history: ReminderHistoryEntry[];
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);

  async function handleClear() {
    const result = await clearReminderHistory();
    if (result?.error) toast(result.error);
    else toast("Reminder history cleared");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 bg-card border border-line rounded-[10px] px-3.5 py-2.5 font-mono text-[12.5px] font-semibold mb-4.5 active:bg-paper-dim"
        onClick={() => setOpen(true)}
      >
        ⏰ Reminder History
        {history.length > 0 && (
          <span className="bg-accent text-white text-[10.5px] rounded-full px-2 py-px">{history.length}</span>
        )}
      </button>

      {open && (
        <Modal
          title={`Reminder History (${history.length})`}
          onCancel={() => setOpen(false)}
          onConfirm={handleClear}
          confirmLabel="Clear all history"
          confirmDisabled={history.length === 0}
          danger
        >
          <div className="max-h-[45vh] overflow-y-auto -mx-1 px-1">
            {history.length === 0 ? (
              <p className="font-mono text-xs text-ink-soft">No reminders have been sent yet.</p>
            ) : (
              [...history].reverse().map((r) => {
                const names =
                  r.target_ids
                    .map((id) => accounts.find((a) => a.id === id)?.name || "(removed)")
                    .join(", ") || "(no one)";
                return (
                  <div key={r.id} className="py-3 border-b border-line last:border-b-0">
                    <div className="text-[13.5px] font-semibold">{r.message}</div>
                    <div className="font-mono text-[10.5px] text-ink-soft mt-0.5">
                      {names} · {fmtDate(r.scheduled_at)} · sent by {r.created_by_name}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
