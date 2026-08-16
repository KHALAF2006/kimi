import React, { useEffect, useState } from "react";
import { SessionLink } from "@/components/SessionLink";
import { Eye, Loader2, Plus, Trash2, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import InstrumentSearchInput from "@/components/market/InstrumentSearchInput";
import { invokeAppFunction } from "@/services/marketService";
import { usePreferences } from "@/lib/preferences";
import { useActiveMarket } from "@/lib/MarketContext";
import { localizedAccessError } from "@/lib/accessCopy";

const copy = {
  ar: { title: "قوائم المتابعة", description: "أنشئ قوائمك وأضف الشركات وافتح شارت أي شركة مباشرة.", newList: "اسم القائمة الجديدة", create: "إنشاء قائمة", symbol: "رمز الشركة", add: "إضافة", empty: "لا توجد قوائم متابعة", noItems: "لم تُضف شركات بعد.", removeItem: "إزالة الشركة", deleteList: "حذف القائمة", confirmList: "هل تريد حذف القائمة وجميع شركاتها؟", noMarket: "لا يوجد سوق مفعّل لإنشاء قوائم المتابعة.", requestMarket: "طلب تفعيل سوق" },
  en: { title: "Watchlists", description: "Create lists, add companies and open any company chart directly.", newList: "New list name", create: "Create list", symbol: "Company symbol", add: "Add", empty: "No watchlists yet", noItems: "No companies added yet.", removeItem: "Remove company", deleteList: "Delete list", confirmList: "Delete this list and all its companies?", noMarket: "No market is active for creating watchlists.", requestMarket: "Request market access" },
};

export default function Watchlists() {
  const { language, isArabic } = usePreferences();
  const { marketCode, market } = useActiveMarket();
  const t = copy[language];
  const [state, setState] = useState({ loading: true, data: [], error: "", busy: "" });
  const [name, setName] = useState("");
  const [symbols, setSymbols] = useState({});

  async function load() {
    if (!marketCode) return;
    setState((value) => ({ ...value, loading: true, error: "" }));
    try {
      const data = await invokeAppFunction("screeningWatchlists", { action: "list", market_code: marketCode });
      setState({ loading: false, data: data.watchlists || [], error: "", busy: "" });
    } catch (error) {
      setState((value) => ({ ...value, loading: false, error: localizedAccessError(error, language), busy: "" }));
    }
  }

  useEffect(() => { setSymbols({}); if (marketCode) load(); else setState({ loading: false, data: [], error: "", busy: "" }); }, [marketCode]);

  async function mutate(key, payload) {
    setState((value) => ({ ...value, busy: key, error: "" }));
    try {
      await invokeAppFunction("screeningWatchlists", { ...payload, market_code: marketCode });
      await load();
      return true;
    } catch (error) {
      setState((value) => ({ ...value, busy: "", error: localizedAccessError(error, language) }));
      return false;
    }
  }

  async function createList(event) {
    event.preventDefault();
    if (await mutate("create", { action: "create", name })) setName("");
  }

  async function addItem(event, watchlistId) {
    event.preventDefault();
    const symbol = String(symbols[watchlistId] || "").trim();
    if (await mutate(`add:${watchlistId}`, { action: "add_item", watchlist_id: watchlistId, symbol })) {
      setSymbols((value) => ({ ...value, [watchlistId]: "" }));
    }
  }

  return <div className="space-y-5">
    <PageHeader title={t.title} description={t.description} action={marketCode ?
      <form onSubmit={createList} className="flex w-full gap-2 sm:w-auto">
        <input className="form-input min-w-0 flex-1 sm:w-64" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required placeholder={t.newList} aria-label={t.newList}/>
        <button className="primary-button shrink-0" disabled={state.busy === "create"}>{state.busy === "create" ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}<span>{t.create}</span></button>
      </form> : null
    }/>
    {!marketCode ? <div className="content-card p-8 text-center"><p className="font-bold">{t.noMarket}</p><SessionLink className="primary-button mt-4 justify-center" to="/market-applications">{t.requestMarket}</SessionLink></div> : <>
    {state.error && <div className="error-banner" role="alert">{state.error}</div>}
    {state.loading ? <StatusPanel loading/> : state.data.length ? <div className="grid gap-4 lg:grid-cols-2">
      {state.data.map((watchlist) => <section key={watchlist.id} className="content-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div><h2 className="font-black">{watchlist.name}</h2><p className="mt-1 text-xs text-slate-500">{watchlist.items?.length || 0}</p></div>
          <button type="button" className="icon-button text-red-600" onClick={() => window.confirm(t.confirmList) && mutate(`delete:${watchlist.id}`, { action: "delete", watchlist_id: watchlist.id })} disabled={state.busy === `delete:${watchlist.id}`} title={t.deleteList} aria-label={`${t.deleteList}: ${watchlist.name}`}><Trash2 size={17}/></button>
        </header>
        <form onSubmit={(event) => addItem(event, watchlist.id)} className="flex gap-2 p-4">
          <div className="min-w-0 flex-1"><InstrumentSearchInput value={symbols[watchlist.id] || ""} onChange={(symbol) => setSymbols((value) => ({ ...value, [watchlist.id]: symbol }))} marketCode={marketCode} isArabic={isArabic} required label={`${t.symbol}: ${watchlist.name}`} /></div>
          <button className="secondary-button shrink-0" disabled={state.busy === `add:${watchlist.id}`}><Plus size={16}/><span>{t.add}</span></button>
        </form>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {watchlist.items?.length ? watchlist.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <SessionLink to={`/company?symbol=${encodeURIComponent(item.symbol)}&market=${encodeURIComponent(marketCode)}`} className="flex min-w-0 flex-1 items-center gap-3 text-sky-700 hover:underline dark:text-sky-300"><Eye size={16}/><span className="min-w-0"><b className="block font-black">{item.symbol} · {isArabic ? item.instrument?.name_ar : item.instrument?.name_en}</b><small className="block truncate text-slate-500">{isArabic ? item.instrument?.sector_ar : item.instrument?.sector_en}{item.quote?.last_price ? ` · ${Number(item.quote.last_price).toFixed(2)} ${market?.currency || ""} (${Number(item.quote.change_percent || 0).toFixed(2)}%)` : ""}</small></span></SessionLink>
            <button type="button" className="icon-button text-red-600" onClick={() => mutate(`remove:${item.id}`, { action: "remove_item", watchlist_id: watchlist.id, item_id: item.id })} disabled={state.busy === `remove:${item.id}`} title={t.removeItem} aria-label={`${t.removeItem}: ${item.symbol}`}><X size={16}/></button>
          </div>) : <p className="px-4 pb-5 text-sm text-slate-500">{t.noItems}</p>}
        </div>
      </section>)}
    </div> : <StatusPanel title={t.empty}/>}</>}
  </div>;
}
