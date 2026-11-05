import { createContext } from "react";

export type ErrorCompartirUbicacion = "noGeolocation" | "locationFailed" | "sendFailed" | null;

export interface LiveLocationShareValue {
  sharing: boolean;
  activeWalkId: string | null;
  error: ErrorCompartirUbicacion;
  start: (walkId: string) => void;
  stop: () => void;
  clearError: () => void;
}

export const LiveLocationShareContext = createContext<LiveLocationShareValue | undefined>(undefined);
