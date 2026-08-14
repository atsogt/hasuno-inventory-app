"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { clearAllRequests } from "@/app/actions/requests";

export default function RequestsHeader({ count }: { count: number }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  async function handleClearAll() {
    const result = await clearAllRequests();
    if (result?.error) toast(result.error);
    else toast("All requests cleared");
    setConfirming(false);
  }

  return (
    <>
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
        Open Requests ({count})
        {count > 0 && (
          <button
            type="button"
            className="normal-case tracking-normal text-[11px] text-accent underline whitespace-nowrap"
            onClick={() => setConfirming(true)}
          >
            clear all
          </button>
        )}
      </h2>

      {confirming && (
        <Modal
          title="Erase all requests?"
          onCancel={() => setConfirming(false)}
          onConfirm={handleClearAll}
          confirmLabel="Erase all"
          danger
        >
          <p className="text-[13.5px] text-ink-soft leading-relaxed">
            This clears all {count} open requests for everyone. This can&apos;t be undone.
          </p>
        </Modal>
      )}
    </>
  );
}
