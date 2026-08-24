import type { Session, User } from "@supabase/supabase-js";
import type { Rol } from "../lib/nav";

export type { Session, User };

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: Rol | null;
  loading: boolean;
}