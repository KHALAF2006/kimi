import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { invokeAppFunction, isReferencePreview } from "@/services/marketService";

const AuthorizationContext = createContext(null);

const REFERENCE_OWNER_PERMISSIONS = [
  "dashboard.owner.read",
  "customers.masked.read",
  "customers.full.read",
  "customers.status.manage",
  "customers.sessions.revoke",
  "subscriptions.read",
  "subscriptions.manage",
  "plans.manage",
  "data.operations.read",
  "data.ingestion.run",
  "data.quality.manage",
  "alerts.operations.read",
  "audit.read",
  "audit.export",
  "roles.manage",
  "settings.manage",
];

export function AuthorizationProvider({ children }) {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const [state, setState] = useState({ loading: true, context: null, error: "" });

  const refresh = useCallback(async () => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
      setState({ loading: false, context: null, error: "" });
      return;
    }
    if (isReferencePreview()) {
      setState({
        loading: false,
        error: "",
        context: {
          identity: { user_id: user?.id, role: "owner", full_name: user?.full_name || "Reference Preview" },
          account: { id: "reference-account", account_type: "personal", status: "active" },
          roles: [],
          permissions: REFERENCE_OWNER_PERMISSIONS,
          subscription: null,
          entitlements: [],
        },
      });
      return;
    }
    try {
      setState((current) => ({ ...current, loading: true, error: "" }));
      const context = await invokeAppFunction("identityContext", { action: "get" });
      setState({ loading: false, context, error: "" });
    } catch (error) {
      setState({ loading: false, context: null, error: error?.response?.data?.error || error?.message || "authorization_context_failed" });
    }
  }, [isAuthenticated, isLoadingAuth, user?.id, user?.full_name]);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => {
    const permissions = new Set(state.context?.permissions || []);
    const entitlements = new Map((state.context?.entitlements || []).map((item) => [item.code, item]));
    return {
      ...state,
      role: state.context?.identity?.role || null,
      can: (permission) => permissions.has(permission),
      hasEntitlement: (code) => Boolean(entitlements.get(code)?.enabled),
      entitlement: (code) => entitlements.get(code) || null,
      refresh,
    };
  }, [state, refresh]);

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>;
}

export function useAuthorization() {
  const value = useContext(AuthorizationContext);
  if (!value) throw new Error("useAuthorization must be used within AuthorizationProvider");
  return value;
}
