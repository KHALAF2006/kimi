import React from "react";
import { Link } from "react-router-dom";
import SourceStamp from "@/components/market/SourceStamp";

export default function MarketTable({ rows = [] }) {
  return <div className="overflow-hidden rounded-2xl border border-white/10"><div className="divide-y divide-white/10">{rows.map((row) => <Link to={`/company?id=${row.id}`} key={row.id} className="grid gap-2 bg-white/[.03] p-4 hover:bg-white/[.06] sm:grid-cols-[1fr_auto] sm:items-center"><div><b>{row.symbol} · {row.name_ar}</b><p className="mt-1 text-sm text-slate-400">{row.sector_ar}</p><SourceStamp quote={row.quote}/></div><div className="text-left"><strong className="text-lg">{row.quote?.last_price?.toLocaleString("ar-SA") ?? "—"}</strong><p className={Number(row.quote?.change_percent) >= 0 ? "text-sm text-emerald-300" : "text-sm text-red-300"}>{row.quote ? `${Number(row.quote.change_percent).toFixed(2)}%` : "—"}</p></div></Link>)}</div></div>;
}