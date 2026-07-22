import React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function CompanyChart({ candles = [] }) {
  const bars = candles.find((item) => item.interval === "1d")?.bars || [];
  if (!bars.length) return <p className="text-sm text-slate-500">لم تصل الشموع التاريخية بعد؛ ستظهر بعد دورة المزامنة التالية.</p>;
  const data = bars.slice(-120).map((bar) => ({ date: new Date(bar.time).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }), close: bar.close }));
  return <div className="h-72" dir="ltr"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid stroke="#ffffff12"/><XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }}/><YAxis domain={["auto", "auto"]} tick={{ fill: "#94a3b8", fontSize: 11 }}/><Tooltip contentStyle={{ background: "#111827", border: "1px solid #334155" }}/><Line type="monotone" dataKey="close" stroke="#34d399" dot={false} strokeWidth={2}/></LineChart></ResponsiveContainer></div>;
}