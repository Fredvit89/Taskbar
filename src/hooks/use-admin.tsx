import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

const ROLE_KEY = "user-role-v1";

export type Role = "guest" | "warehouse" | "manager" | "admin";

export const ROLE_PINS: Record<Exclude<Role, "guest">, string> = {
  admin: "2468",
  manager: "1357",
  warehouse: "1111",
};

export const ROLE_LABELS: Record<Role, string> = {
  guest: "Gość",
  warehouse: "Magazynier",
  manager: "Menedżer",
  admin: "Administrator",
};

interface AdminContextValue {
  role: Role;
  isAdmin: boolean;
  isManager: boolean;
  isWarehouse: boolean;
  /** Может редактировать заказы (только admin) */
  canEdit: boolean;
  /** Видит цены и суммы (admin + manager) */
  canSeePrices: boolean;
  /** Любая авторизованная роль */
  isAuthed: boolean;
  unlock: (pin: string) => Role | null;
  lock: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

const isRole = (v: unknown): v is Role =>
  v === "guest" || v === "warehouse" || v === "manager" || v === "admin";

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>("guest");

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(ROLE_KEY);
      if (isRole(v)) setRole(v);
    } catch {}
  }, []);

  const unlock = useCallback((pin: string): Role | null => {
    const entry = (Object.entries(ROLE_PINS) as [Exclude<Role, "guest">, string][])
      .find(([, p]) => p === pin);
    if (!entry) return null;
    const next = entry[0];
    setRole(next);
    try {
      sessionStorage.setItem(ROLE_KEY, next);
    } catch {}
    return next;
  }, []);

  const lock = useCallback(() => {
    setRole("guest");
    try {
      sessionStorage.removeItem(ROLE_KEY);
    } catch {}
  }, []);

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isWarehouse = role === "warehouse";

  return (
    <AdminContext.Provider
      value={{
        role,
        isAdmin,
        isManager,
        isWarehouse,
        canEdit: isAdmin,
        canSeePrices: isAdmin || isManager,
        isAuthed: role !== "guest",
        unlock,
        lock,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};
