import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, authorizationContext, readJsonBody, replyError, requireMarketEntitlement } from "../../shared/security.ts";

function cleanName(value) {
  const name = String(value || "").trim();
  if (name.length < 2 || name.length > 80) throw Object.assign(new Error("Name must be 2-80 characters"), { status: 400 });
  return name;
}

async function ownedWatchlist(base44, profile, watchlistId, marketCode) {
  const row = await base44.asServiceRole.entities.Watchlist.get(String(watchlistId || ""));
  const rowMarket = row?.market_code || "SA_MAIN";
  if (!row || row.customer_id !== profile.id || rowMarket !== marketCode) throw Object.assign(new Error("Watchlist not found"), { status: 404 });
  return row;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req);
    const context = await authorizationContext(base44, body.session_id, body.device_id);
    const marketCode = requireMarketEntitlement(context, body.market_code);
    const { user, profile } = context;
    if (body.action === "list") {
      const allWatchlists = await base44.asServiceRole.entities.Watchlist.filter({ customer_id: profile.id });
      const watchlists = allWatchlists.filter((row) => (row.market_code || "SA_MAIN") === marketCode);
      const ids = new Set(watchlists.map((row) => row.id));
      const allItems = await base44.asServiceRole.entities.WatchlistItem.list("-updated_date", 5e3);
      const items = allItems.filter((row) => ids.has(row.watchlist_id) && (row.market_code || "SA_MAIN") === marketCode);
      const instrumentIds = new Set(items.map((item) => item.instrument_id));
      const [instruments, quotes] = await Promise.all([
        base44.asServiceRole.entities.Instrument.filter({ market_code: marketCode }),
        base44.asServiceRole.entities.QuoteLatest.list("-quote_time", 500),
      ]);
      const instrumentById = new Map(instruments.filter((item) => instrumentIds.has(item.id)).map((item) => [item.id, item]));
      const quoteByInstrument = new Map();
      for (const quote of quotes) if (instrumentIds.has(quote.instrument_id) && quote.market_code === marketCode && !quoteByInstrument.has(quote.instrument_id)) quoteByInstrument.set(quote.instrument_id, quote);
      const hydrated = items.map((item) => ({
        ...item,
        market_code: marketCode,
        instrument: instrumentById.get(item.instrument_id) || null,
        quote: quoteByInstrument.get(item.instrument_id) || null,
        reference_status: instrumentById.has(item.instrument_id) ? "linked" : "missing_instrument",
      }));
      return Response.json({ market_code: marketCode, watchlists: watchlists.map((row) => ({ ...row, market_code: marketCode, items: hydrated.filter((item) => item.watchlist_id === row.id) })) });
    }
    if (body.action === "create") {
      const watchlist = await base44.asServiceRole.entities.Watchlist.create({ customer_id: profile.id, market_code: marketCode, name: cleanName(body.name) });
      await audit(base44, user.id, "watchlist.create", "Watchlist", watchlist.id, "success", `market:${marketCode}`);
      return Response.json({ watchlist });
    }
    if (body.action === "add_item") {
      const watchlist = await ownedWatchlist(base44, profile, body.watchlist_id, marketCode);
      const symbol = String(body.symbol || "").trim().toUpperCase();
      if (!/^[A-Z0-9.-]{1,16}$/.test(symbol)) return Response.json({ error: "Valid market symbol required" }, { status: 400 });
      const instruments = await base44.asServiceRole.entities.Instrument.filter({ symbol, market_code: marketCode });
      if (!instruments[0] || instruments[0].status === "delisted") return Response.json({ error: "Instrument not found in the active market" }, { status: 404 });
      const existing = await base44.asServiceRole.entities.WatchlistItem.filter({ watchlist_id: watchlist.id, instrument_id: instruments[0].id });
      const item = existing[0] || await base44.asServiceRole.entities.WatchlistItem.create({ watchlist_id: watchlist.id, instrument_id: instruments[0].id, market_code: marketCode, symbol });
      if (!existing[0]) await audit(base44, user.id, "watchlist.item.add", "WatchlistItem", item.id, "success", `market:${marketCode};instrument:${instruments[0].id}`);
      return Response.json({ item: { ...item, instrument: instruments[0] }, created: !existing[0] });
    }
    if (body.action === "remove_item") {
      const watchlist = await ownedWatchlist(base44, profile, body.watchlist_id, marketCode);
      const item = await base44.asServiceRole.entities.WatchlistItem.get(String(body.item_id || ""));
      if (!item || item.watchlist_id !== watchlist.id || (item.market_code || "SA_MAIN") !== marketCode) return Response.json({ error: "Watchlist item not found" }, { status: 404 });
      await base44.asServiceRole.entities.WatchlistItem.delete(item.id);
      await audit(base44, user.id, "watchlist.item.remove", "WatchlistItem", item.id, "success", `market:${marketCode};watchlist:${watchlist.id}`);
      return Response.json({ removed: true });
    }
    if (body.action === "delete") {
      const watchlist = await ownedWatchlist(base44, profile, body.watchlist_id, marketCode);
      const items = await base44.asServiceRole.entities.WatchlistItem.filter({ watchlist_id: watchlist.id });
      for (const item of items) await base44.asServiceRole.entities.WatchlistItem.delete(item.id);
      await base44.asServiceRole.entities.Watchlist.delete(watchlist.id);
      await audit(base44, user.id, "watchlist.delete", "Watchlist", watchlist.id, "success", `market:${marketCode}`);
      return Response.json({ removed: true });
    }
    if (body.action === "save_screen") {
      const screen = await base44.asServiceRole.entities.SavedScreen.create({ customer_id: profile.id, name: cleanName(body.name), filters: { ...(body.filters || {}), market_code: marketCode } });
      return Response.json({ screen });
    }
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
