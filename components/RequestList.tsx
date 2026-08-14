"use client";

import { useState } from "react";
import RequestChit from "@/components/RequestChit";
import type { Request } from "@/lib/types";

export default function RequestList({
  requests,
  showRequester,
  allowDeleteAll,
  selfId,
}: {
  requests: Request[];
  showRequester: boolean;
  allowDeleteAll: boolean;
  selfId?: string;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (requests.length === 0) {
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

  if (!showRequester) {
    return (
      <>
        {requests.map((r) => (
          <RequestChit
            key={r.id}
            request={r}
            showRequester={false}
            canDelete={allowDeleteAll || r.requested_by_id === selfId}
            showReminderControls={r.requested_by_id === selfId}
          />
        ))}
      </>
    );
  }

  const groups: { id: string; name: string; items: Request[] }[] = [];
  const groupIndex = new Map<string, number>();
  for (const r of requests) {
    let idx = groupIndex.get(r.requested_by_id);
    if (idx === undefined) {
      idx = groups.length;
      groupIndex.set(r.requested_by_id, idx);
      groups.push({ id: r.requested_by_id, name: r.requested_by_name, items: [] });
    }
    groups[idx].items.push(r);
  }

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.id);
        const urgentCount = group.items.filter((r) => r.urgent).length;
        return (
          <div key={group.id} className="mb-5">
            <button
              type="button"
              onClick={() => toggle(group.id)}
              className="w-full flex items-center gap-2 mb-2.5 font-mono text-xs uppercase tracking-widest text-ink-soft after:content-[''] after:flex-1 after:h-px after:bg-line"
            >
              <span
                className={`inline-block transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                aria-hidden="true"
              >
                ▾
              </span>
              {group.name}
              <span className="text-ink-soft/70">({group.items.length})</span>
              {urgentCount > 0 && <span className="badge-urgent">{urgentCount} urgent</span>}
            </button>
            {!isCollapsed &&
              group.items.map((r) => (
                <RequestChit
                  key={r.id}
                  request={r}
                  showRequester={false}
                  canDelete={allowDeleteAll || r.requested_by_id === selfId}
                  showReminderControls={r.requested_by_id === selfId}
                />
              ))}
          </div>
        );
      })}
    </>
  );
}
