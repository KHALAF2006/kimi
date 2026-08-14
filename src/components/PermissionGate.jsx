import React from "react";
import { Navigate } from "react-router-dom";
import StatusPanel from "@/components/StatusPanel";
import { useAuthorization } from "@/lib/AuthorizationContext";

export default function PermissionGate({ permission, ownerOnly = false, children }) {
  const { loading, error, can, role } = useAuthorization();
  if (loading) return <StatusPanel loading />;
  if (error) return <StatusPanel error={error} />;
  if (!can(permission) || (ownerOnly && role !== "owner")) return <Navigate to="/dashboard" replace />;
  return children;
}
