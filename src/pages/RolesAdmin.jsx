import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Plus, RefreshCcw, Save, Search, ShieldCheck, UserRoundCog } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { invokeAppFunction } from "@/services/marketService";
import { useAuthorization } from "@/lib/AuthorizationContext";
import { usePreferences } from "@/lib/preferences";

function errorMessage(error) {
  return error?.response?.data?.error || error?.message || "تعذر تنفيذ العملية.";
}

function PermissionCard({ permission, index, onAdd = null }) {
  return <Draggable draggableId={permission.code} index={index}>
    {(provided) => <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-2"><ShieldCheck size={16} className="mt-0.5 text-sky-500" /><div className="min-w-0 flex-1"><b>{permission.name_ar}</b><code className="mt-1 block truncate text-[10px] text-slate-400">{permission.code}</code></div>{onAdd && <button type="button" onClick={() => onAdd(permission.code)} className="icon-button" title="إضافة الصلاحية"><Plus size={14} /></button>}</div>
    </div>}
  </Draggable>;
}

export default function RolesAdmin() {
  const { context, refresh: refreshIdentity } = useAuthorization();
  const { isArabic } = usePreferences();
  const [state, setState] = useState({ loading: true, data: null, error: "", busy: false, status: "" });
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [permissionCodes, setPermissionCodes] = useState([]);
  const [search, setSearch] = useState("");
  const [roleReason, setRoleReason] = useState("");
  const [newRoleReason, setNewRoleReason] = useState("");
  const [assignmentReason, setAssignmentReason] = useState("");
  const [newRole, setNewRole] = useState({ code: "", name_ar: "", name_en: "", description: "" });
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberRoleIds, setMemberRoleIds] = useState([]);

  async function load() {
    try {
      setState((current) => ({ ...current, loading: true, error: "" }));
      const data = await invokeAppFunction("adminRoles", { action: "list" });
      setState((current) => ({ ...current, loading: false, data }));
      const firstRole = data.roles?.find((role) => !role.reserved) || data.roles?.[0];
      if (firstRole && !selectedRoleId) {
        setSelectedRoleId(firstRole.id);
        setPermissionCodes(firstRole.permissions || []);
      }
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: errorMessage(error) }));
    }
  }

  useEffect(() => { load(); }, []);

  const selectedRole = state.data?.roles?.find((role) => role.id === selectedRoleId) || null;
  const filteredPermissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (state.data?.permissions || []).filter((permission) => !query || `${permission.code} ${permission.name_ar} ${permission.name_en}`.toLowerCase().includes(query));
  }, [state.data?.permissions, search]);
  const granted = filteredPermissions.filter((permission) => permissionCodes.includes(permission.code));
  const available = filteredPermissions.filter((permission) => !permissionCodes.includes(permission.code));

  function selectRole(role) {
    setSelectedRoleId(role.id);
    setPermissionCodes(role.permissions || []);
    setRoleReason("");
  }

  function addPermission(code) {
    setPermissionCodes((values) => values.includes(code) ? values : [...values, code]);
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    const code = result.draggableId;
    if (result.destination.droppableId === "granted") addPermission(code);
    else setPermissionCodes((values) => values.filter((value) => value !== code));
  }

  async function run(payload, success) {
    try {
      setState((current) => ({ ...current, busy: true, error: "", status: "" }));
      const result = await invokeAppFunction("adminRoles", payload);
      await Promise.all([load(), refreshIdentity()]);
      setState((current) => ({ ...current, busy: false, status: `${success} ${new Date().toLocaleTimeString(isArabic ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}` }));
      return result;
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error: errorMessage(error) }));
      return null;
    }
  }

  async function createRole(event) {
    event.preventDefault();
    if (newRoleReason.trim().length < 3) return setState((current) => ({ ...current, error: isArabic ? "اكتب سبب الإنشاء من ثلاثة أحرف على الأقل." : "Enter a creation reason of at least three characters." }));
    const saved = await run({ action: "create", role: newRole, reason: newRoleReason }, isArabic ? "أُنشئ الدور المخصص وحُفظ." : "The custom role was created and saved.");
    if (saved) {
      setNewRole({ code: "", name_ar: "", name_en: "", description: "" });
      setNewRoleReason("");
    }
  }

  function selectMember(memberId) {
    setSelectedMemberId(memberId);
    const assigned = (state.data?.assignments || []).filter((item) => item.member_id === memberId).map((item) => item.role_id);
    setMemberRoleIds(assigned);
    setAssignmentReason("");
  }

  async function savePermissions() {
    if (roleReason.trim().length < 3) return setState((current) => ({ ...current, error: isArabic ? "اكتب سبب تعديل الصلاحيات من ثلاثة أحرف على الأقل." : "Enter a permission-change reason of at least three characters." }));
    const saved = await run({ action: "set_permissions", role_id: selectedRole.id, expected_revision: selectedRole.revision, permission_codes: permissionCodes, reason: roleReason }, isArabic ? "حُفظت صلاحيات الدور وتأكدت من الخادم." : "Role permissions were saved and confirmed by the server.");
    if (saved) setRoleReason("");
  }

  async function saveAssignment() {
    if (!selectedMemberId) return setState((current) => ({ ...current, error: isArabic ? "اختر عضواً غير حساب المالك." : "Choose a member other than the owner account." }));
    if (assignmentReason.trim().length < 3) return setState((current) => ({ ...current, error: isArabic ? "اكتب سبب الإسناد من ثلاثة أحرف على الأقل." : "Enter an assignment reason of at least three characters." }));
    const saved = await run({ action: "assign", member_id: selectedMemberId, role_ids: memberRoleIds, reason: assignmentReason }, isArabic ? "حُفظ إسناد الأدوار وتأكدت من الخادم." : "Role assignment was saved and confirmed by the server.");
    if (saved) setAssignmentReason("");
  }

  const assignableMembers = (state.data?.members || []).filter((member) => member.id !== context?.account?.membership_id);

  if (state.loading && !state.data) return <><PageHeader title="الأدوار والصلاحيات" description="صلاحيات خلفية قابلة لإعادة الاستخدام ومحمية من رفع الامتيازات." /><StatusPanel loading /></>;

  return <>
    <PageHeader title="الأدوار والصلاحيات" description="اسحب الصلاحيات أو أضفها، راجع الفرق، ثم احفظ بسبب واضح. التنفيذ النهائي يُتحقق منه في الخلفية." />
    {state.error && <StatusPanel error={state.error} />}
    {state.status && <div className="mx-auto mb-4 max-w-[1800px] rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300" role="status" aria-live="polite">{state.status}</div>}
    <div className="mx-auto grid max-w-[1800px] gap-5 px-4 pb-10 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d192a]">
        <div className="flex items-center justify-between"><b>الأدوار</b><button type="button" className="icon-button" onClick={load} title="تحديث"><RefreshCcw size={15} /></button></div>
        {state.data?.roles?.map((role) => <button type="button" key={role.id} onClick={() => selectRole(role)} className={`w-full rounded-xl border p-3 text-start ${role.id === selectedRoleId ? "border-sky-400 bg-sky-400/10" : "border-slate-200 dark:border-slate-700"}`}><b className="block">{role.name_ar}</b><small className="text-slate-400">{role.permissions?.length || 0} صلاحية {role.reserved ? "· رسمي" : "· مخصص"}</small></button>)}
        <button type="button" disabled={state.busy} onClick={() => run({ action: "bootstrap", reason: "تهيئة دليل الصلاحيات الرسمي" }, isArabic ? "هُيئت الأدوار والصلاحيات الرسمية." : "Official roles and permissions were initialized.")} className="secondary-button w-full">تهيئة الأدوار الرسمية</button>
      </aside>

      <div className="space-y-5">
        {selectedRole && <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">{selectedRole.name_ar}</h2><p className="text-xs text-slate-400">{selectedRole.code} · المراجعة {selectedRole.revision}</p></div>{selectedRole.reserved && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">دور رسمي غير قابل للتعديل</span>}</div>
          <label className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><Search size={15} /><input className="h-10 flex-1 bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في الصلاحيات" /></label>
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Droppable droppableId="available">{(provided) => <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-52 space-y-2 rounded-2xl border border-dashed border-slate-300 p-3 dark:border-slate-700"><b className="block text-sm">الصلاحيات المتاحة</b>{available.map((permission, index) => <PermissionCard key={permission.code} permission={permission} index={index} onAdd={selectedRole.reserved ? null : addPermission} />)}{provided.placeholder}</div>}</Droppable>
              <Droppable droppableId="granted">{(provided) => <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-52 space-y-2 rounded-2xl border border-sky-300 bg-sky-50/40 p-3 dark:border-sky-500/30 dark:bg-sky-950/10"><b className="block text-sm">صلاحيات الدور</b>{granted.map((permission, index) => <PermissionCard key={permission.code} permission={permission} index={index} />)}{provided.placeholder}</div>}</Droppable>
            </div>
          </DragDropContext>
          {!selectedRole.reserved && <div className="mt-4 flex flex-wrap gap-3"><input className="form-input min-w-64 flex-1" value={roleReason} onChange={(event) => setRoleReason(event.target.value)} placeholder={isArabic ? "سبب التعديل إلزامي" : "Change reason is required"} minLength={3} /><button type="button" className="primary-button" disabled={state.busy} onClick={savePermissions}><Save size={15} />{isArabic ? "حفظ الصلاحيات" : "Save permissions"}</button></div>}
        </section>}

        <section className="grid gap-5 xl:grid-cols-2">
          <form onSubmit={createRole} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">
            <h2 className="font-black">إنشاء دور مخصص</h2>
            <div className="mt-4 grid gap-3"><input className="form-input" value={newRole.code} onChange={(event) => setNewRole((value) => ({ ...value, code: event.target.value }))} placeholder="رمز الدور بالإنجليزية" required /><input className="form-input" value={newRole.name_ar} onChange={(event) => setNewRole((value) => ({ ...value, name_ar: event.target.value }))} placeholder="الاسم العربي" required /><input className="form-input" value={newRole.name_en} onChange={(event) => setNewRole((value) => ({ ...value, name_en: event.target.value }))} placeholder="الاسم الإنجليزي" required /><textarea className="form-input min-h-20" value={newRole.description} onChange={(event) => setNewRole((value) => ({ ...value, description: event.target.value }))} placeholder="وصف مختصر" /><input className="form-input" value={newRoleReason} onChange={(event) => setNewRoleReason(event.target.value)} placeholder={isArabic ? "سبب الإنشاء" : "Creation reason"} minLength={3} required /><button className="primary-button" disabled={state.busy}><Plus size={15} />{isArabic ? "إنشاء الدور" : "Create role"}</button></div>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">
            <h2 className="font-black">إسناد الأدوار</h2>
            <div className="mt-4 grid gap-3"><select className="form-input" value={selectedMemberId} onChange={(event) => selectMember(event.target.value)}><option value="">{isArabic ? "اختر عضواً" : "Choose a member"}</option>{assignableMembers.map((member) => <option key={member.id} value={member.id}>{member.full_name || member.customer_number || member.customer_id}</option>)}</select>{!assignableMembers.length && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">{isArabic ? "لا يوجد عضو آخر حالياً. حساب المالك يملك صلاحياته مباشرة ولا يُسند لنفسه دوراً." : "There is no other member yet. The owner account already has direct permissions and cannot assign a role to itself."}</p>}{selectedMemberId && <div className="space-y-2">{state.data?.roles?.map((role) => <label key={role.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><input type="checkbox" checked={memberRoleIds.includes(role.id)} onChange={(event) => setMemberRoleIds((values) => event.target.checked ? [...values, role.id] : values.filter((id) => id !== role.id))} /><UserRoundCog size={15} />{isArabic ? role.name_ar : role.name_en}</label>)}</div>}<input className="form-input" value={assignmentReason} onChange={(event) => setAssignmentReason(event.target.value)} placeholder={isArabic ? "سبب الإسناد" : "Assignment reason"} minLength={3} /><button type="button" className="primary-button" disabled={state.busy} onClick={saveAssignment}><Save size={15} />{isArabic ? "حفظ الإسناد" : "Save assignment"}</button></div>
          </section>
        </section>
      </div>
    </div>
  </>;
}
