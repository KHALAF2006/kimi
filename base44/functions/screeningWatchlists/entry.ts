import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, authorizationContext, replyError } from "../../shared/security.ts";
function cleanName(value) {
  const name = String(value || "").trim();
  if (name.length < 2 || name.length > 80) throw Object.assign(new Error("Name must be 2-80 characters"), { status: 400 });
  return name;
}
async function ownedWatchlist(base44, profile, watchlistId) {
  const row = await base44.asServiceRole.entities.Watchlist.get(String(watchlistId || ""));
  if (!row || row.customer_id !== profile.id) throw Object.assign(new Error("Watchlist not found"), { status: 404 });
  return row;
}
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { user, profile } = await authorizationContext(base44, body.session_id);
    if (body.action === "list") {
      const watchlists = await base44.asServiceRole.entities.Watchlist.filter({ customer_id: profile.id });
      const ids = new Set(watchlists.map((row) => row.id));
      const allItems = await base44.asServiceRole.entities.WatchlistItem.list("-updated_date", 5e3);
      const items = allItems.filter((row) => ids.has(row.watchlist_id));
      const instrumentIds = new Set(items.map((item) => item.instrument_id));
      const [instruments, quotes] = await Promise.all([
        base44.asServiceRole.entities.Instrument.list("symbol", 500),
        base44.asServiceRole.entities.QuoteLatest.list("-quote_time", 500),
      ]);
      const instrumentById = new Map(instruments.filter((item) => instrumentIds.has(item.id)).map((item) => [item.id, item]));
      const quoteByInstrument = new Map();
      for (const quote of quotes) if (instrumentIds.has(quote.instrument_id) && !quoteByInstrument.has(quote.instrument_id)) quoteByInstrument.set(quote.instrument_id, quote);
      const hydrated = items.map((item) => ({
        ...item,
        instrument: instrumentById.get(item.instrument_id) || null,
        quote: quoteByInstrument.get(item.instrument_id) || null,
        reference_status: instrumentById.has(item.instrument_id) ? "linked" : "missing_instrument",
      }));
      return Response.json({ watchlists: watchlists.map((row) => ({ ...row, items: hydrated.filter((item) => item.watchlist_id === row.id) })) });
    }
    if (body.action === "create") {
      const watchlist = await base44.asServiceRole.entities.Watchlist.create({ customer_id: profile.id, name: cleanName(body.name) });
      await audit(base44, user.id, "watchlist.create", "Watchlist", watchlist.id, "success");
      return Response.json({ watchlist });
    }
    if (body.action === "add_item") {
      const watchlist = await ownedWatchlist(base44, profile, body.watchlist_id);
      const symbol = String(body.symbol || "").trim();
      if (!/^\d{4}$/.test(symbol)) return Response.json({ error: "Valid four-digit symbol required" }, { status: 400 });
      const instruments = await base44.asServiceRole.entities.Instrument.filter({ symbol, market_code: "SA_MAIN" });
      if (!instruments[0] || instruments[0].status === "delisted") return Response.json({ error: "Instrument not found" }, { status: 404 });
      const existing = await base44.asServiceRole.entities.WatchlistItem.filter({ watchlist_id: watchlist.id, instrument_id: instruments[0].id });
      const item = existing[0] || await base44.asServiceRole.entities.WatchlistItem.create({ watchlist_id: watchlist.id, instrument_id: instruments[0].id, symbol });
      if (!existing[0]) await audit(base44, user.id, "watchlist.item.add", "WatchlistItem", item.id, "success", `instrument:${instruments[0].id}`);
      return Response.json({ item: { ...item, instrument: instruments[0] }, created: !existing[0] });
    }
    if (body.action === "remove_item") {
      const watchlist = await ownedWatchlist(base44, profile, body.watchlist_id);
      const item = await base44.asServiceRole.entities.WatchlistItem.get(String(body.item_id || ""));
      if (!item || item.watchlist_id !== watchlist.id) return Response.json({ error: "Watchlist item not found" }, { status: 404 });
      await base44.asServiceRole.entities.WatchlistItem.delete(item.id);
      await audit(base44, user.id, "watchlist.item.remove", "WatchlistItem", item.id, "success", `watchlist:${watchlist.id}`);
      return Response.json({ removed: true });
    }
    if (body.action === "delete") {
      const watchlist = await ownedWatchlist(base44, profile, body.watchlist_id);
      const items = await base44.asServiceRole.entities.WatchlistItem.filter({ watchlist_id: watchlist.id });
      for (const item of items) await base44.asServiceRole.entities.WatchlistItem.delete(item.id);
      await base44.asServiceRole.entities.Watchlist.delete(watchlist.id);
      await audit(base44, user.id, "watchlist.delete", "Watchlist", watchlist.id, "success");
      return Response.json({ removed: true });
    }
    if (body.action === "save_screen") {
      const screen = await base44.asServiceRole.entities.SavedScreen.create({ customer_id: profile.id, name: cleanName(body.name), filters: body.filters || {} });
      return Response.json({ screen });
    }
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
