import { createContext } from "react";
import type { AuthState } from "../types/auth.types";
import type { ProfileUpdate, RegistrationData, UserProfile } from "../types/auth.types";

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, profile: RegistrationData) => Promise<boolean>;
  getProfile: () => Promise<UserProfile | null>;
  updateProfile: (profile: ProfileUpdate) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
