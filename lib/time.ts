export function fmtDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

export function elapsedInfo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  const hrs = mins / 60;
  let label: string;
  if (mins < 1) label = "just now";
  else if (mins < 60) label = mins + "m ago";
  else if (hrs < 24) label = hrs.toFixed(1).replace(/\.0$/, "") + "h ago";
  else label = Math.floor(hrs / 24) + "d ago";

  let cls = "elapsed-fresh";
  if (hrs >= 1 && hrs < 3) cls = "elapsed-warn";
  if (hrs >= 3) cls = "elapsed-stale";
  return { label, cls };
}

export const elapsedClassMap = {
  "elapsed-fresh": "bg-[#E6EEE6] text-success",
  "elapsed-warn": "bg-[#F3E7D2] text-warn",
  "elapsed-stale": "bg-[#F3DEDB] text-accent",
} as const;
