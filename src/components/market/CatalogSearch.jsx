import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import DataNotice from "@/components/market/DataNotice";
import MarketTable from "@/components/market/MarketTable";

export default function CatalogSearch() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ loading: true, rows: [], error: "" });
  useEffect(() => { const timer = setTimeout(() => { setState((value) => ({ ...value, loading: true })); base44.functions.invoke("marketRead", { query, limit: 500, session_id: localStorage.getItem("kmy_session_id") }).then((response) => setState({ loading: false, rows: response.data.instruments || [], error: "" })).catch((error) => setState({ loading: false, rows: [], error: error.response?.data?.error || error.message })); }, 250); return () => clearTimeout(timer); }, [query]);
  return <><DataNotice/><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالرمز أو الاسم أو القطاع" className="mb-5 h-12 border-white/10 bg-white/[.04]"/>{state.loading ? <p className="text-slate-400">جارٍ البحث…</p> : state.error ? <p className="text-red-300">{state.error}</p> : <><p className="mb-3 text-sm text-slate-400">{state.rows.length} نتيجة</p><MarketTable rows={state.rows}/></>}</>;
}