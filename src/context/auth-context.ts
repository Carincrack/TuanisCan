import { createContext } from "react";
import type { AuthState } from "../types/auth.types";
import type { ProfileUpdate, RegistrationData, RolPublico, UserProfile } from "../types/auth.types";
import type { Rol } from "../lib/nav";

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string, preferredRole?: Rol) => Promise<void>;
  register: (email: string, password: string, profile: RegistrationData) => Promise<boolean>;
  getProfile: () => Promise<UserProfile | null>;
  updateProfile: (profile: ProfileUpdate) => Promise<void>;
  addRole: (role: RolPublico) => Promise<void>;
  setActiveRole: (role: Rol) => void;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
