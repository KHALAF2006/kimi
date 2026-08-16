import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { audit, readJsonBody, replyError, requirePermission } from "../../shared/security.ts";
import { PERMISSION_CATALOG, PERMISSION_CODES, RESERVED_ROLE_TEMPLATES } from "../../shared/permissions.ts";

function bad(message, code = "INVALID_ROLE_REQUEST", status = 400) {
  throw Object.assign(new Error(message), { status, code });
}

function cleanReason(value) {
  const reason = String(value || "").trim();
  if (reason.length < 3 || reason.length > 500) bad("A reason between 3 and 500 characters is required", "REASON_REQUIRED");
  return reason;
}

function cleanRole(value) {
  const code = String(value?.code || "").trim().toLowerCase();
  const nameAr = String(value?.name_ar || "").trim();
  const nameEn = String(value?.name_en || "").trim();
  if (!/^[a-z][a-z0-9_]{2,49}$/.test(code)) bad("Role code must use 3-50 lowercase letters, numbers, or underscores");
  if (nameAr.length < 2 || nameAr.length > 80 || nameEn.length < 2 || nameEn.length > 80) bad("Valid Arabic and English role names are required");
  return { code, name_ar: nameAr, name_en: nameEn, description: String(value?.description || "").trim().slice(0, 500) };
}

async function seedCatalog(base44, userId) {
  for (const permission of PERMISSION_CATALOG) {
    const rows = await base44.asServiceRole.entities.PermissionDefinition.filter({ code: permission.code });
    if (!rows[0]) await base44.asServiceRole.entities.PermissionDefinition.create(permission);
  }
  for (const template of RESERVED_ROLE_TEMPLATES) {
    const rows = await base44.asServiceRole.entities.RoleDefinition.filter({ code: template.code });
    let role = rows[0] || null;
    if (!role) {
      role = await base44.asServiceRole.entities.RoleDefinition.create({
        code: template.code,
        name_ar: template.name_ar,
        name_en: template.name_en,
        description: "",
        reserved: true,
        active: true,
        revision: 1,
        created_by_user_id: userId,
      });
    }
    const grants = await base44.asServiceRole.entities.RolePermission.filter({ role_id: role.id });
    const existing = new Set(grants.map((item) => item.permission_code));
    for (const permissionCode of template.permissions) {
      if (!existing.has(permissionCode)) {
        await base44.asServiceRole.entities.RolePermission.create({ role_id: role.id, permission_code: permissionCode, granted_by_user_id: userId });
      }
    }
  }
}

async function roleView(base44, role) {
  const grants = await base44.asServiceRole.entities.RolePermission.filter({ role_id: role.id });
  return { ...role, permissions: grants.map((item) => item.permission_code).sort() };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await readJsonBody(req);
    const context = await requirePermission(base44, body.session_id, body.device_id, "roles.manage");
    if (context.role !== "owner") bad("Only the platform owner can manage administrative roles", "OWNER_REQUIRED", 403);

    if (body.action === "bootstrap") {
      const reason = cleanReason(body.reason);
      await seedCatalog(base44, context.user.id);
      await audit(base44, context.user.id, "roles.bootstrap", "RoleDefinition", "catalog", "success", reason, {}, { permissions: PERMISSION_CATALOG.length, roles: RESERVED_ROLE_TEMPLATES.length });
    }

    if (body.action === "list" || body.action === "bootstrap") {
      const roles = await base44.asServiceRole.entities.RoleDefinition.list("name_ar", 200);
      const memberships = await base44.asServiceRole.entities.AccountMember.list("-created_date", 200);
      const assignments = await base44.asServiceRole.entities.MemberRoleAssignment.filter({ status: "active" });
      const members = [];
      for (const member of memberships.filter((item) => item.status === "active")) {
        let customer = null;
        try {
          customer = await base44.asServiceRole.entities.CustomerProfile.get(member.customer_id);
        } catch {
          customer = null;
        }
        members.push({
          id: member.id,
          account_id: member.account_id,
          customer_id: member.customer_id,
          member_type: member.member_type,
          full_name: customer?.full_name || "",
          customer_number: customer?.customer_number || "",
        });
      }
      return Response.json({
        permissions: PERMISSION_CATALOG,
        roles: await Promise.all(roles.filter((role) => role.active !== false).map((role) => roleView(base44, role))),
        members,
        assignments,
      });
    }

    if (body.action === "create") {
      const reason = cleanReason(body.reason);
      const input = cleanRole(body.role);
      const matches = await base44.asServiceRole.entities.RoleDefinition.filter({ code: input.code });
      if (matches[0]) bad("Role code already exists", "ROLE_CODE_CONFLICT", 409);
      const role = await base44.asServiceRole.entities.RoleDefinition.create({
        ...input,
        reserved: false,
        active: true,
        revision: 1,
        created_by_user_id: context.user.id,
      });
      await audit(base44, context.user.id, "role.create", "RoleDefinition", role.id, "success", reason, {}, role);
      return Response.json({ role: await roleView(base44, role) });
    }

    if (body.action === "set_permissions") {
      const reason = cleanReason(body.reason);
      const role = await base44.asServiceRole.entities.RoleDefinition.get(String(body.role_id || ""));
      if (!role || role.active === false) bad("Role not found", "ROLE_NOT_FOUND", 404);
      if (role.reserved) bad("Reserved roles are immutable; create a custom role", "RESERVED_ROLE_IMMUTABLE", 409);
      if (Number(body.expected_revision) !== Number(role.revision)) bad("Role was changed by another administrator", "REVISION_CONFLICT", 409);
      const requested = [...new Set((Array.isArray(body.permission_codes) ? body.permission_codes : []).map(String))];
      if (requested.some((code) => !PERMISSION_CODES.has(code))) bad("Unknown permission code");
      const before = await roleView(base44, role);
      const current = await base44.asServiceRole.entities.RolePermission.filter({ role_id: role.id });
      for (const grant of current) {
        if (!requested.includes(grant.permission_code)) await base44.asServiceRole.entities.RolePermission.delete(grant.id);
      }
      const existing = new Set(current.map((item) => item.permission_code));
      for (const code of requested) {
        if (!existing.has(code)) await base44.asServiceRole.entities.RolePermission.create({ role_id: role.id, permission_code: code, granted_by_user_id: context.user.id });
      }
      const updated = await base44.asServiceRole.entities.RoleDefinition.update(role.id, { revision: Number(role.revision) + 1 });
      const after = await roleView(base44, updated);
      await audit(base44, context.user.id, "role.permissions_changed", "RoleDefinition", role.id, "success", reason, before, after);
      return Response.json({ role: after });
    }

    if (body.action === "assign") {
      const reason = cleanReason(body.reason);
      const member = await base44.asServiceRole.entities.AccountMember.get(String(body.member_id || ""));
      if (!member || member.status !== "active") bad("Member not found", "MEMBER_NOT_FOUND", 404);
      if (member.id === context.membership.id) bad("Self-assignment is not allowed", "SELF_ASSIGNMENT_DENIED", 403);
      const roleIds = [...new Set((Array.isArray(body.role_ids) ? body.role_ids : []).map(String))];
      const roles = [];
      for (const roleId of roleIds) {
        const role = await base44.asServiceRole.entities.RoleDefinition.get(roleId);
        if (!role?.active) bad("Assigned role not found", "ROLE_NOT_FOUND", 404);
        roles.push(role);
      }
      const before = await base44.asServiceRole.entities.MemberRoleAssignment.filter({ member_id: member.id, status: "active" });
      for (const assignment of before) {
        if (!roleIds.includes(assignment.role_id)) {
          await base44.asServiceRole.entities.MemberRoleAssignment.update(assignment.id, {
            status: "revoked",
            revoked_at: new Date().toISOString(),
            reason,
            revision: Number(assignment.revision || 1) + 1,
          });
        }
      }
      const activeRoleIds = new Set(before.map((item) => item.role_id));
      for (const role of roles) {
        if (!activeRoleIds.has(role.id)) {
          await base44.asServiceRole.entities.MemberRoleAssignment.create({
            member_id: member.id,
            role_id: role.id,
            status: "active",
            assigned_by_user_id: context.user.id,
            reason,
            revision: 1,
          });
        }
      }
      await base44.asServiceRole.entities.ActiveDeviceSession.updateMany({ customer_id: member.customer_id, revoked_at: null }, { $set: { revoked_at: new Date().toISOString() } });
      const after = await base44.asServiceRole.entities.MemberRoleAssignment.filter({ member_id: member.id, status: "active" });
      const persistedRoleIds = [...new Set(after.map((item) => String(item.role_id)))].sort();
      const expectedRoleIds = [...roleIds].sort();
      if (JSON.stringify(persistedRoleIds) !== JSON.stringify(expectedRoleIds)) {
        bad("Role assignment was not persisted", "ROLE_ASSIGNMENT_PERSISTENCE_FAILED", 500);
      }
      await audit(base44, context.user.id, "member.roles_changed", "AccountMember", member.id, "success", reason, before, after);
      return Response.json({ assignments: after, sessions_revoked: true });
    }

    if (body.action === "archive") {
      const reason = cleanReason(body.reason);
      const role = await base44.asServiceRole.entities.RoleDefinition.get(String(body.role_id || ""));
      if (!role) bad("Role not found", "ROLE_NOT_FOUND", 404);
      if (role.reserved) bad("Reserved roles cannot be archived", "RESERVED_ROLE_IMMUTABLE", 409);
      if (Number(body.expected_revision) !== Number(role.revision)) bad("Role was changed by another administrator", "REVISION_CONFLICT", 409);
      const after = await base44.asServiceRole.entities.RoleDefinition.update(role.id, { active: false, revision: Number(role.revision) + 1 });
      const assignments = await base44.asServiceRole.entities.MemberRoleAssignment.filter({ role_id: role.id, status: "active" });
      for (const assignment of assignments) {
        await base44.asServiceRole.entities.MemberRoleAssignment.update(assignment.id, { status: "revoked", revoked_at: new Date().toISOString(), reason, revision: Number(assignment.revision || 1) + 1 });
      }
      await audit(base44, context.user.id, "role.archived", "RoleDefinition", role.id, "success", reason, role, after);
      return Response.json({ role: after });
    }

    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return replyError(error);
  }
});
