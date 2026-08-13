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

  return (
    <>
      {requests.map((r) => (
        <RequestChit
          key={r.id}
          request={r}
          showRequester={showRequester}
          canDelete={allowDeleteAll || r.requested_by_id === selfId}
          showReminderControls={r.requested_by_id === selfId}
        />
      ))}
    </>
  );
}
