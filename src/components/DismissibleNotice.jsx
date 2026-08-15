import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

export default function DismissibleNotice({ message, tone = "success", timeoutMs = 25_000, onDismiss }) {
  const [visible, setVisible] = useState(Boolean(message));
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    setVisible(Boolean(message));
    if (!message || timeoutMs <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setVisible(false);
      dismissRef.current?.();
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [message, timeoutMs]);
  if (!message || !visible) return null;
  const error = tone === "error";
  const Icon = error ? XCircle : CheckCircle2;
  return <div role={error ? "alert" : "status"} className={`fixed bottom-4 end-4 z-[140] flex max-w-md items-start gap-3 rounded-2xl border p-4 text-sm shadow-2xl ${error ? "border-red-700/50 bg-red-950 text-red-100" : "border-emerald-700/50 bg-emerald-950 text-emerald-100"}`}>
    <Icon className="mt-0.5 shrink-0" size={18} />
    <span className="flex-1 leading-6">{message}</span>
    <button type="button" className="rounded-lg p-1 transition hover:bg-white/10" onClick={() => { setVisible(false); dismissRef.current?.(); }} aria-label="Close"><X size={16} /></button>
  </div>;
}
