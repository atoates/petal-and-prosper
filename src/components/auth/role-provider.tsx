"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "@/lib/auth/permissions";

const RoleContext = createContext<Role | null>(null);

export function RoleProvider({
  role,
  children,
}: {
  role: Role | null;
  children: ReactNode;
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

/**
 * Hook for client components to read the current user's role, fetched on
 * the server in the dashboard layout. Returns `null` for unauthenticated
 * contexts or sessions with no recognised role.
 */
export function useRole(): Role | null {
  return useContext(RoleContext);
}
