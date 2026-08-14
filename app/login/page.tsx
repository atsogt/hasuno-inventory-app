"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-24 h-24 mb-3.5 flex items-center justify-center">
        <Image src="/logo.png" alt="Hasuno" width={96} height={96} className="object-contain" />
      </div>
      <h1 className="font-black text-2xl mb-0.5">Hasuno</h1>
      <p className="font-mono text-[11px] text-ink-soft tracking-widest uppercase mb-7">
        Inventory Requests
      </p>

      <form action={handleSubmit} className="w-full max-w-xs">
        <div className="mb-3.5">
          <label className="field-label" htmlFor="name">
            Name
          </label>
          <input className="field-input" id="name" name="name" autoComplete="username" required />
        </div>
        <div className="mb-3.5">
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            className="field-input"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <button className="btn btn-primary w-full" type="submit" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="text-urgent text-[12.5px] font-mono mt-2.5 text-center">{error}</p>}
      </form>
    </div>
  );
}
