import type { ReactNode } from "react";
import type { Rol } from "../lib/nav";
import { useAuth } from "../hooks/useAuth";

const RoleGuard = ({
  roles,
  children,
  fallback,
}: {
  roles: Rol[];
  children: ReactNode;
  fallback: ReactNode;
}) => {
  const { role } = useAuth();
  return role && roles.includes(role) ? <>{children}</> : <>{fallback}</>;
};

export default RoleGuard;