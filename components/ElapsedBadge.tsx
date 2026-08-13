"use client";

import { useEffect, useState } from "react";
import { elapsedInfo, elapsedClassMap } from "@/lib/time";

export default function ElapsedBadge({ sentAt }: { sentAt: string }) {
  const [info, setInfo] = useState(() => elapsedInfo(sentAt));

  useEffect(() => {
    const id = setInterval(() => setInfo(elapsedInfo(sentAt)), 30000);
    return () => clearInterval(id);
  }, [sentAt]);

  return (
    <span
      className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap h-fit ${elapsedClassMap[info.cls as keyof typeof elapsedClassMap]}`}
    >
      {info.label}
    </span>
  );
}
