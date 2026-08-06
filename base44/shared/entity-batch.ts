export function entityRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

export async function upsertEntityRows(base44, entity, incoming, fields, filter) {
  const key = (row) => fields.map((field) => String(row[field] ?? "")).join("|");
  const unique = [...new Map(incoming.map((row) => [key(row), row])).values()];
  const existing = entityRows(await base44.asServiceRole.entities[entity].filter(filter, "-updated_date", 5000));
  const byKey = new Map(existing.map((row) => [key(row), row]));
  const creates = unique.filter((row) => !byKey.has(key(row)));
  const updates = unique.filter((row) => byKey.has(key(row))).map((row) => ({ id: byKey.get(key(row)).id, ...row }));
  if (creates.length) await base44.asServiceRole.entities[entity].bulkCreate(creates);
  if (updates.length) await base44.asServiceRole.entities[entity].bulkUpdate(updates);
  return { created: creates.length, updated: updates.length };
}