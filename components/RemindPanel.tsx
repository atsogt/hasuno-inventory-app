"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { fmtDate } from "@/lib/time";
import { scheduleStaffReminder, deleteStaffReminder } from "@/app/actions/reminders";
import type { Profile, StaffReminder } from "@/lib/types";

const WHEN_OPTIONS = [
  { label: "Now", value: "now" },
  { label: "In 1 hour", value: "1h" },
  { label: "Tomorrow 9am", value: "tomorrow9" },
  { label: "Custom", value: "custom" },
] as const;

export default function RemindPanel({
  accounts,
  staffReminders,
}: {
  accounts: Profile[];
  staffReminders: StaffReminder[];
}) {
  const toast = useToast();
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [when, setWhen] = useState<(typeof WHEN_OPTIONS)[number]["value"]>("now");
  const [customTime, setCustomTime] = useState("");
  const [message, setMessage] = useState("Time to place your inventory order.");

  const workers = accounts.filter((a) => a.role === "worker" && !a.locked);

  function toggleWorker(id: string) {
    setSelectedWorkers((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));
  }

  function resolveWhenIso(): string | null {
    const now = new Date();
    if (when === "now") return now.toISOString();
    if (when === "1h") return new Date(now.getTime() + 60 * 60000).toISOString();
    if (when === "tomorrow9") {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    }
    return customTime ? new Date(customTime).toISOString() : null;
  }

  async function sendReminder() {
    const iso = resolveWhenIso();
    if (!iso) {
      toast("Pick a custom time");
      return;
    }
    const result = await scheduleStaffReminder(selectedWorkers, iso, message);
    if (result?.error) toast(result.error);
    else {
      toast(`Reminder scheduled for ${result.count} worker${result.count === 1 ? "" : "s"}`);
      setSelectedWorkers([]);
    }
  }

  async function cancelReminder(id: string) {
    await deleteStaffReminder(id);
    toast("Reminder cancelled");
  }

  return (
    <>
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
        Remind Workers to Order
      </h2>
      <div className="panel-card">
        <label className="field-label">Select workers</label>
        {workers.length === 0 ? (
          <p className="font-mono text-xs text-ink-soft">No active workers to remind yet.</p>
        ) : (
          <div className="flex flex-col gap-0.5 border border-line rounded-[10px] overflow-hidden">
            {workers.map((w, i) => (
              <label
                key={w.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-sm ${i % 2 === 1 ? "bg-paper-dim" : "bg-paper"}`}
              >
                <input
                  type="checkbox"
                  className="accent-ink"
                  checked={selectedWorkers.includes(w.id)}
                  onChange={() => toggleWorker(w.id)}
                />
                <span>{w.name}</span>
              </label>
            ))}
          </div>
        )}

        <label className="field-label mt-3.5">Send at</label>
        <div className="grid grid-cols-2 gap-2">
          {WHEN_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 px-3 py-2.5 border border-line rounded-[10px] bg-paper text-[13px]">
              <input
                type="radio"
                className="accent-ink"
                name="when"
                checked={when === opt.value}
                onChange={() => setWhen(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        {when === "custom" && (
          <div className="field mt-2.5">
            <input
              className="field-input"
              type="datetime-local"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />
          </div>
        )}

        <div className="field mt-3.5 mb-4">
          <label className="field-label">Message</label>
          <input className="field-input" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <button className="btn btn-accent w-full" onClick={sendReminder} type="button">
          Send reminder
        </button>
      </div>

      {staffReminders.length > 0 && (
        <>
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 mt-6 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
            Scheduled / Sent Reminders
          </h2>
          {staffReminders.map((r) => {
            const names = r.target_ids
              .map((id) => accounts.find((a) => a.id === id)?.name || "(removed)")
              .join(", ");
            const due = new Date(r.scheduled_at).getTime() <= Date.now();
            return (
              <div key={r.id} className="flex justify-between items-start gap-2.5 py-3 border-b border-line">
                <div>
                  <div className="text-[13.5px] font-semibold">{r.message}</div>
                  <div className="font-mono text-[10.5px] text-ink-soft mt-0.5">
                    {names} · {fmtDate(r.scheduled_at)} · {due ? "sent" : "scheduled"}
                  </div>
                </div>
                <button className="font-mono text-[11px] text-ink-soft underline" onClick={() => cancelReminder(r.id)} type="button">
                  cancel
                </button>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
