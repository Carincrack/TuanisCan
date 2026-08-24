import { createContext } from "react";
import type { AuthState } from "../types/auth.types";
import type { RegistrationData, UserProfile } from "../types/auth.types";

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, profile: RegistrationData) => Promise<boolean>;
  getProfile: () => Promise<UserProfile | null>;
  updateProfile: (profile: Pick<UserProfile, "nombre" | "telefono" | "foto_perfil" | "zona_id">) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);