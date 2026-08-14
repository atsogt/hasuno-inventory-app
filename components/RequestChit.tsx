"use client";

import { useState } from "react";
import ElapsedBadge from "@/components/ElapsedBadge";
import Modal from "@/components/Modal";
import { fmtDate } from "@/lib/time";
import {
  deleteRequest,
  editRequestAmount,
  setRequestReminder,
  clearRequestReminder,
} from "@/app/actions/requests";
import { useToast } from "@/components/Toast";
import type { Request } from "@/lib/types";

const QUICK_OPTIONS = [
  { label: "30 min", mins: 30 },
  { label: "1 hour", mins: 60 },
  { label: "3 hours", mins: 180 },
  { label: "Tomorrow 9am", tomorrow9: true },
] as const;

export default function RequestChit({
  request,
  canDelete,
  showRequester,
  showReminderControls,
}: {
  request: Request;
  canDelete: boolean;
  showRequester: boolean;
  showReminderControls: boolean;
}) {
  const [reminderOpen, setReminderOpen] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [amountEditOpen, setAmountEditOpen] = useState(false);
  const [amountInput, setAmountInput] = useState(String(request.amount ?? ""));
  const toast = useToast();

  const reminderDue = !!request.reminder_at && new Date(request.reminder_at).getTime() <= Date.now();

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

  async function setQuick(opt: (typeof QUICK_OPTIONS)[number]) {
    let when: Date;
    if ("tomorrow9" in opt && opt.tomorrow9) {
      when = new Date();
      when.setDate(when.getDate() + 1);
      when.setHours(9, 0, 0, 0);
    } else {
      when = new Date(Date.now() + ("mins" in opt ? opt.mins : 0) * 60000);
    }
    const result = await setRequestReminder(request.id, when.toISOString());
    if (result?.error) toast(result.error);
    else toast("Reminder set for " + fmtDate(when.toISOString()));
    setReminderOpen(false);
  }

  async function setCustom() {
    if (!customTime) return;
    const result = await setRequestReminder(request.id, new Date(customTime).toISOString());
    if (result?.error) toast(result.error);
    else toast("Reminder set for " + fmtDate(new Date(customTime).toISOString()));
    setReminderOpen(false);
    setCustomTime("");
  }

  async function handleClearReminder() {
    await clearRequestReminder(request.id);
  }

  return (
    <>
      <div className={`chit ${reminderDue ? "border-accent ring-1 ring-accent" : ""}`}>
        <div className="flex justify-between items-start gap-2.5">
          <div>
            <div className="font-bold text-[16px]">
              {request.item_name}
              {request.amount ? (
                <span className="font-mono text-xs font-medium text-ink-soft"> ×{request.amount}</span>
              ) : null}
            </div>
            <div className="font-mono text-[11px] text-ink-soft mt-1 leading-relaxed">
              {fmtDate(request.sent_at)}
              {showRequester ? ` · ${request.requested_by_name}` : ""}
            </div>
          </div>
          <ElapsedBadge sentAt={request.sent_at} />
        </div>
        <div className="mt-2.5 flex justify-between items-center gap-2.5">
          {showReminderControls ? (
            request.reminder_at ? (
              <div
                className={`font-mono text-[11px] flex items-center gap-1.5 ${reminderDue ? "text-accent font-semibold" : "text-warn"}`}
              >
                ⏰ {reminderDue ? "Reminder due" : "Reminder " + fmtDate(request.reminder_at)}
                <button
                  className="font-mono text-[10px] text-ink-soft underline"
                  onClick={handleClearReminder}
                  type="button"
                >
                  clear
                </button>
              </div>
            ) : (
              <button
                className="font-mono text-[11px] text-ink-soft underline"
                onClick={() => setReminderOpen(true)}
                type="button"
              >
                ⏰ Set reminder
              </button>
            )
          ) : (
            <span />
          )}
          {canDelete && (
            <span className="flex items-center gap-3">
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
            </span>
          )}
        </div>
      </div>

      {amountEditOpen && (
        <Modal
          title="Edit quantity"
          onCancel={() => setAmountEditOpen(false)}
          onConfirm={handleSaveAmount}
          confirmLabel="Save"
        >
          <div className="field">
            <label className="field-label">{request.item_name} — quantity</label>
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

      {reminderOpen && (
        <Modal
          title="Set a reminder"
          onCancel={() => setReminderOpen(false)}
          onConfirm={setCustom}
          confirmLabel="Set"
          confirmDisabled={!customTime}
        >
          <p className="text-[13.5px] text-ink-soft leading-relaxed mb-4">
            {request.item_name} — you&apos;ll see a highlighted notice once the reminder time passes.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3.5">
            {QUICK_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                className="btn btn-ghost text-[13px] px-2.5 py-2.5"
                type="button"
                onClick={() => setQuick(opt)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label className="field-label">Or pick exact time</label>
          <input
            className="field-input"
            type="datetime-local"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
          />
        </Modal>
      )}
    </>
  );
}
