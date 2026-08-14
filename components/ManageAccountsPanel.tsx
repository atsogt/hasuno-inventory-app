"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { saveAccountContact, toggleLock, deleteAccount } from "@/app/actions/accounts";
import { canManage } from "@/lib/auth-client";
import type { Profile } from "@/lib/types";

const ROLE_STYLE: Record<Profile["role"], string> = {
  owner: "bg-ink text-paper",
  manager: "bg-accent text-white",
  worker: "bg-paper-dim text-ink-soft",
};

export default function ManageAccountsPanel({
  actor,
  accounts,
}: {
  actor: Profile;
  accounts: Profile[];
}) {
  const toast = useToast();
  const [contactEditing, setContactEditing] = useState<Profile | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [deleting, setDeleting] = useState<Profile | null>(null);

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

  return (
    <>
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
        All Accounts ({accounts.length})
      </h2>

      <div className="flex flex-col gap-2.5">
        {accounts.map((a) => {
          const manageable = canManage(actor, a);
          return (
            <div
              key={a.id}
              className={`bg-card border rounded-xl px-4 py-3.5 ${a.locked ? "border-accent/40" : "border-line"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-paper-dim flex items-center justify-center font-bold text-[13px] shrink-0">
                    {a.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[15px] truncate">{a.name}</span>
                      <span className={`font-mono text-[9.5px] uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_STYLE[a.role]}`}>
                        {a.role}
                      </span>
                    </div>
                    {a.phone || a.email ? (
                      <div className="font-mono text-[10.5px] text-ink-soft mt-0.5 truncate">
                        {[a.phone, a.email].filter(Boolean).join(" · ")}
                      </div>
                    ) : (
                      <div className="font-mono text-[10.5px] text-ink-soft italic opacity-70 mt-0.5">
                        no phone/email on file
                      </div>
                    )}
                  </div>
                </div>
                {a.locked && (
                  <span className="font-mono text-[10px] text-accent shrink-0">locked</span>
                )}
              </div>
              {manageable && (
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-line">
                  <button className="flex-1 bg-paper-dim border border-line rounded-lg py-1.5 font-mono text-[11px]" onClick={() => openContactEditor(a)} type="button">
                    Contact
                  </button>
                  <button className="flex-1 bg-paper-dim border border-line rounded-lg py-1.5 font-mono text-[11px]" onClick={() => handleToggleLock(a)} type="button">
                    {a.locked ? "Unlock" : "Lock"}
                  </button>
                  <button className="flex-1 bg-paper-dim border border-line rounded-lg py-1.5 font-mono text-[11px] text-accent" onClick={() => setDeleting(a)} type="button">
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
