import React from "react";
import { useAuthorization } from "@/lib/AuthorizationContext";

export default function IdentityWatermark() {
  const { context, role } = useAuthorization();
  if (!context?.identity || role === "owner") return null;
  const label = `${context.identity.full_name || "Smart Investor"} · ${context.identity.phone_e164 || context.identity.customer_number || ""}`;
  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] overflow-hidden opacity-[0.055] mix-blend-multiply dark:mix-blend-screen"><div className="grid h-[140%] w-[140%] -translate-x-[10%] -translate-y-[10%] rotate-[-18deg] grid-cols-3 content-around gap-24 text-center text-xs font-bold tracking-wide">{Array.from({ length: 24 }, (_, index) => <span key={index}>{label}</span>)}</div></div>;
}
