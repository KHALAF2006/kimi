import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

const PLATFORM_OWNER_USER_ID = "6a600ea3afc36e37cea9e385";

const CHILD_ENTITIES = {
  QuoteLatest: { source: "quote-latest", fingerprint: (row) => row.instrument_id },
  CandleChunk: { source: "candle-chunk", fingerprint: (row) => `${row.instrument_id}:${row.interval}:${row.chunk_key}` },
  IndicatorSnapshot: { source: "indicator-snapshot", fingerprint: (row) => `${row.instrument_id}:${row.version || row.calculated_at || row.as_of_date || ""}` },
  LossClassification: { source: "loss-classification", fingerprint: (row) => `${row.instrument_id}:${row.as_of_date || row.calculated_at || ""}` },
  CompanyFinancial: { source: "company-financial", fingerprint: (row) => `${row.instrument_id}:${row.period_type || ""}:${row.fiscal_year || ""}:${row.period_end || ""}` },
  CorporateAction: { source: "corporate-action", fingerprint: (row) => `${row.instrument_id}:${row.action_type || ""}:${row.effective_date || ""}` },
  CompanyAnnouncement: { source: "company-announcement", fingerprint: (row) => `${row.instrument_id}:${row.external_id || row.published_at || row.title_ar || ""}` },
  MajorShareholder: { source: "major-shareholder", fingerprint: (row) => `${row.instrument_id}:${row.holder_name_ar || row.holder_name_en || ""}:${row.as_of_date || ""}` },
};

const STATUS_ENTITIES = {
  CustomerProfile: "customer-profile",
  Instrument: "instrument",
  ...Object.fromEntries(Object.entries(CHILD_ENTITIES).map(([target, config]) => [target, config.source])),
};

function stripServerFields(row) {
  const copy = { ...row };
  for (const key of ["id", "created_date", "updated_date", "created_by", "created_by_id", "is_sample"]) delete copy[key];
  return copy;
}

function chunks(rows, size = 50) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) result.push(rows.slice(index, index + size));
  return result;
}

async function bulkCreate(handler, rows) {
  let created = 0;
  for (const batch of chunks(rows)) {
    const result = await handler.bulkCreate(batch);
    created += result.length;
  }
  return created;
}

async function trustedOwner(base44) {
  const user = await base44.auth.me();
  if (!user || user.role !== "admin" || user.id !== PLATFORM_OWNER_USER_ID) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  const profiles = await base44.asServiceRole.entities["customer-profile"].filter({ auth_user_id: user.id });
  const profile = profiles[0] || null;
  return { user, profile };
}

async function status(base44) {
  const result = {};
  for (const [targetName, sourceName] of Object.entries(STATUS_ENTITIES)) {
    const [sourceRows, targetRows] = await Promise.all([
      base44.asServiceRole.entities[sourceName].list("-created_date", 5000),
      base44.asServiceRole.entities[targetName].list("-created_date", 5000),
    ]);
    result[targetName] = { legacy: sourceRows.length, official: targetRows.length };
  }
  return result;
}

async function copyOwner(base44, owner) {
  const target = base44.asServiceRole.entities.CustomerProfile;
  const existing = await target.filter({ auth_user_id: owner.user.id });
  if (existing[0]) return { created: 0, customer_id: existing[0].id };
  const now = new Date().toISOString();
  const sourceTrusted = owner.profile?.acquisition_source === "platform_owner_bootstrap"
    && Array.isArray(owner.profile?.tags)
    && owner.profile.tags.includes("owner");
  const row = sourceTrusted ? stripServerFields(owner.profile) : {
    customer_number: `KMY-OWNER-${owner.user.id.slice(-8).toUpperCase()}`,
    auth_user_id: owner.user.id,
    email_normalized: String(owner.user.email || "").trim().toLowerCase(),
    full_name: String(owner.user.full_name || owner.user.email || "Platform Owner"),
    preferred_language: "ar",
    account_status: "active",
    role: "owner",
    acquisition_source: "platform_owner_bootstrap",
    tags: ["owner", "schema_bridge_bootstrap"],
    email_verified_at: now,
    last_seen_at: now,
  };
  delete row.personal_account_id;
  const created = await target.create(row);
  return { created: 1, customer_id: created.id };
}

async function copyInstruments(base44) {
  const sourceRows = await base44.asServiceRole.entities.instrument.list("symbol", 5000);
  const target = base44.asServiceRole.entities.Instrument;
  const targetRows = await target.list("symbol", 5000);
  const existingSymbols = new Set(targetRows.map((row) => row.symbol));
  const pending = sourceRows
    .filter((row) => row.symbol && !existingSymbols.has(row.symbol))
    .map(stripServerFields);
  return {
    legacy: sourceRows.length,
    existing: targetRows.length,
    created: await bulkCreate(target, pending),
  };
}

async function instrumentMaps(base44) {
  const [legacy, official] = await Promise.all([
    base44.asServiceRole.entities.instrument.list("symbol", 5000),
    base44.asServiceRole.entities.Instrument.list("symbol", 5000),
  ]);
  const officialBySymbol = new Map(official.map((row) => [row.symbol, row]));
  const targetIdByLegacyId = new Map();
  for (const row of legacy) {
    const target = officialBySymbol.get(row.symbol);
    if (target) targetIdByLegacyId.set(row.id, target.id);
  }
  return targetIdByLegacyId;
}

async function copyChildEntity(base44, targetName, offset, limit) {
  const config = CHILD_ENTITIES[targetName];
  if (!config) throw Object.assign(new Error("Unsupported migration entity"), { status: 400 });
  const source = base44.asServiceRole.entities[config.source];
  const target = base44.asServiceRole.entities[targetName];
  const [sourceRows, targetRows, targetIdByLegacyId] = await Promise.all([
    source.list("created_date", limit, offset),
    target.list("created_date", 5000),
    instrumentMaps(base44),
  ]);
  const targetFingerprints = new Set(targetRows.map(config.fingerprint));
  const pending = [];
  let skippedMissingInstrument = 0;
  for (const sourceRow of sourceRows) {
    const targetInstrumentId = targetIdByLegacyId.get(sourceRow.instrument_id);
    if (!targetInstrumentId) {
      skippedMissingInstrument += 1;
      continue;
    }
    const row = stripServerFields(sourceRow);
    row.instrument_id = targetInstrumentId;
    const fingerprint = config.fingerprint(row);
    if (!targetFingerprints.has(fingerprint)) {
      targetFingerprints.add(fingerprint);
      pending.push(row);
    }
  }
  return {
    entity: targetName,
    offset,
    processed: sourceRows.length,
    created: await bulkCreate(target, pending),
    skipped_existing: sourceRows.length - pending.length - skippedMissingInstrument,
    skipped_missing_instrument: skippedMissingInstrument,
    has_more: sourceRows.length === limit,
    next_offset: offset + sourceRows.length,
  };
}

function replyError(error) {
  const statusCode = Number(error?.status) || 500;
  if (statusCode >= 500) console.error("Legacy schema bridge failed", error);
  return Response.json({
    error: statusCode >= 500 ? "Migration operation failed" : String(error?.message || "Request failed"),
  }, { status: statusCode });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const owner = await trustedOwner(base44);
    const action = String(body.action || "status");

    if (action === "status") return Response.json({ status: await status(base44) });
    if (action === "copy_owner") return Response.json(await copyOwner(base44, owner));
    if (action === "copy_instruments") return Response.json(await copyInstruments(base44));
    if (action === "copy_entity") {
      const offset = Math.max(0, Number.parseInt(String(body.offset || 0), 10) || 0);
      const limit = Math.min(100, Math.max(1, Number.parseInt(String(body.limit || 50), 10) || 50));
      return Response.json(await copyChildEntity(base44, String(body.entity || ""), offset, limit));
    }
    throw Object.assign(new Error("Unsupported action"), { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
