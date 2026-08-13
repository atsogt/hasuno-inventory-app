"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { fmtDate } from "@/lib/time";
import { addAccount, saveAccountContact, toggleLock, deleteAccount } from "@/app/actions/accounts";
import { scheduleStaffReminder, deleteStaffReminder } from "@/app/actions/reminders";
import { canManage } from "@/lib/auth-client";
import type { Profile, Role, StaffReminder } from "@/lib/types";

const WHEN_OPTIONS = [
  { label: "Now", value: "now" },
  { label: "In 1 hour", value: "1h" },
  { label: "Tomorrow 9am", value: "tomorrow9" },
  { label: "Custom", value: "custom" },
] as const;

export default function AccountsScreen({
  actor,
  accounts,
  staffReminders,
}: {
  actor: Profile;
  accounts: Profile[];
  staffReminders: StaffReminder[];
}) {
  const toast = useToast();

  // add-account form
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("worker");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // contact editor
  const [contactEditing, setContactEditing] = useState<Profile | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // delete confirm
  const [deleting, setDeleting] = useState<Profile | null>(null);

  // remind-workers panel
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [when, setWhen] = useState<(typeof WHEN_OPTIONS)[number]["value"]>("now");
  const [customTime, setCustomTime] = useState("");
  const [message, setMessage] = useState("Time to place your inventory order.");

  async function handleAdd() {
    const result = await addAccount(name, password, role, phone, email);
    if (result?.error) {
      toast(result.error);
      return;
    }
    toast(`Account added: ${name.trim()}`);
    setName("");
    setPassword("");
    setRole("worker");
    setPhone("");
    setEmail("");
  }

  function openContactEditor(a: Profile) {
    setContactEditing(a);
    setEditPhone(a.phone || "");
    setEditEmail(a.email || "");
  }

  async function saveContact() {
    if (!contactEditing) return;
    const result = await saveAccountContact(contactEditing.id, editPhone, editEmail);
    if (result?.error) toast(result.error);
    else toast(`Saved contact info for ${contactEditing.name}`);
    setContactEditing(null);
  }

  async function handleToggleLock(a: Profile) {
    const result = await toggleLock(a.id);
    if (result?.error) toast(result.error);
    else toast(result.locked ? `Locked ${result.name}` : `Unlocked ${result.name}`);
  }

  async function confirmDeleteAccount() {
    if (!deleting) return;
    const result = await deleteAccount(deleting.id);
    if (result?.error) toast(result.error);
    else toast("Account deleted");
    setDeleting(null);
  }

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

  const workers = accounts.filter((a) => a.role === "worker" && !a.locked);
  const roleOptions: Role[] = actor.role === "owner" ? ["worker", "manager"] : ["worker"];

  return (
    <>
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
        Manage Accounts
      </h2>
      <div className="panel-card">
        <h3 className="m-0 mb-3.5 text-[13px] uppercase tracking-wide font-mono text-ink-soft">Add account</h3>
        <div className="field mb-3.5">
          <label className="field-label">Name</label>
          <input className="field-input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field mb-3.5">
          <label className="field-label">Assigned password</label>
          <input className="field-input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field mb-3.5">
          <label className="field-label">Role</label>
          <select className="field-input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r[0].toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="field mb-3.5">
          <label className="field-label">Phone</label>
          <input className="field-input" type="tel" placeholder="(317) 555-0100" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field mb-4">
          <label className="field-label">Email</label>
          <input className="field-input" type="email" placeholder="name@hasuno.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn btn-primary w-full" onClick={handleAdd} type="button">
          Add account
        </button>
      </div>

      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 mt-2 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
        All Accounts ({accounts.length})
      </h2>
      {accounts.map((a) => {
        const manageable = canManage(actor, a);
        return (
          <div key={a.id} className="flex items-center justify-between gap-2.5 py-3.5 border-b border-line">
            <div>
              <div className="font-bold text-[15px] flex items-center gap-2">
                {a.name}
                <span
                  className={`font-mono text-[9.5px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                    a.role === "owner" ? "bg-ink text-paper" : a.role === "manager" ? "bg-accent text-white" : "bg-paper-dim text-ink-soft"
                  }`}
                >
                  {a.role}
                </span>
              </div>
              {a.phone || a.email ? (
                <div className="font-mono text-[10.5px] text-ink-soft mt-0.5">
                  {[a.phone, a.email].filter(Boolean).join(" · ")}
                </div>
              ) : (
                <div className="font-mono text-[10.5px] text-ink-soft italic opacity-70 mt-0.5">
                  no phone/email on file
                </div>
              )}
              {a.locked && <div className="text-accent font-mono text-[10.5px]">locked</div>}
            </div>
            {manageable && (
              <div className="flex gap-1.5">
                <button className="bg-paper-dim border border-line rounded-lg px-2.5 py-1.5 font-mono text-[11px]" onClick={() => openContactEditor(a)} type="button">
                  Contact
                </button>
                <button className="bg-paper-dim border border-line rounded-lg px-2.5 py-1.5 font-mono text-[11px]" onClick={() => handleToggleLock(a)} type="button">
                  {a.locked ? "Unlock" : "Lock"}
                </button>
                <button className="bg-paper-dim border border-line rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-accent" onClick={() => setDeleting(a)} type="button">
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      })}

      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 mt-6 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
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

      {contactEditing && (
        <Modal title={`Contact info — ${contactEditing.name}`} onCancel={() => setContactEditing(null)} onConfirm={saveContact} confirmLabel="Save">
          <div className="field mb-3.5">
            <label className="field-label">Phone</label>
            <input className="field-input" type="tel" placeholder="(317) 555-0100" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" placeholder="name@hasuno.com" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete account?" onCancel={() => setDeleting(null)} onConfirm={confirmDeleteAccount} confirmLabel="Delete" danger>
          <p className="text-[13.5px] text-ink-soft">
            Delete {deleting.name}&apos;s account? This can&apos;t be undone.
          </p>
        </Modal>
      )}
    </>
  );
}
