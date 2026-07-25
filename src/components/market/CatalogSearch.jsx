import React, { useEffect, useState } from "react";
import { invokeAppFunction } from "@/services/marketService";
import { Input } from "@/components/ui/input";
import MarketTable from "@/components/market/MarketTable";

export default function CatalogSearch() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ loading: true, rows: [], error: "" });
  useEffect(() => { const timer = setTimeout(() => { setState((value) => ({ ...value, loading: true })); invokeAppFunction("marketRead", { query, limit: 500 }).then((response) => setState({ loading: false, rows: response.instruments || [], error: "" })).catch((error) => setState({ loading: false, rows: [], error: error.response?.data?.error || error.message })); }, 250); return () => clearTimeout(timer); }, [query]);
  return <><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالرمز أو الاسم أو القطاع" className="mb-5 h-12 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"/>{state.loading ? <p className="text-slate-400">جارٍ البحث…</p> : state.error ? <p className="text-red-600">{state.error}</p> : <><p className="mb-3 text-sm text-slate-500">{state.rows.length} نتيجة</p><MarketTable rows={state.rows}/></>}</>;
}
