"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { addAccount } from "@/app/actions/accounts";
import type { Role } from "@/lib/types";

export default function AddAccountForm({ actorRole }: { actorRole: Role }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("worker");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const roleOptions: Role[] = actorRole === "owner" ? ["worker", "manager"] : ["worker"];

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

  return (
    <>
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
        Add Account
      </h2>
      <div className="panel-card">
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
    </>
  );
}
