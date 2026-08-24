import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

const AuthGuard = ({ children, fallback }: { children: ReactNode; fallback: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <>{fallback}</>;
  return <>{children}</>;
};

export default AuthGuard;