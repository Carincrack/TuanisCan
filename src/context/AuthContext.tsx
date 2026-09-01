import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  getSession,
  login as loginService,
  logout,
  onAuthStateChange,
  register as registerService,
  resetPassword as resetPasswordService,
  updatePassword as updatePasswordService,
  getUserProfile,
  updateUserProfile,
  addRoleToMyAccount,
} from "../services/auth.service";
import type { AuthState, ProfileUpdate, RegistrationData, RolPublico, UserProfile } from "../types/auth.types";
import type { Rol } from "../lib/nav";
import { AuthContext } from "./auth-context";

const ACTIVE_ROLE_KEY = "tuaniscan.activeRole";
const INACTIVE_ACCOUNT_MESSAGE =
  "Tu cuenta está inactiva. Contacta a administración para reactivarla.";

const adminFromUser = (user: Session["user"] | null): boolean => {
  const role = user?.app_metadata?.app_role;
  return role === "admin";
};

/* Los perfiles con los que la cuenta puede ENTRAR.

   No es lo mismo que `usuario_rol` en la base. Ahí el rol de paseador
   no se inserta al registrarse: aparece recién cuando administración
   aprueba la verificación. O sea que esa tabla está sirviendo de sello
   de aprobación, y de paso quedó siendo la llave de la puerta. Efecto:
   quien se registraba como paseador entraba con `roles: []`, no había
   panel que montar y caía en "Esta cuenta no tiene perfiles activos" —
   fuera del sistema antes de poder subir un solo documento.

   Tener perfil de paseador ya alcanza para abrir el panel, que es lo
   único que se decide acá. `profile.paseador` llega siempre: la
   política `paseadores_select_own` es `auth.uid() = id_usuario`, sin
   rol de por medio.

   Ejercer sigue dependiendo de la aprobación, y eso no lo decide esta
   función ni ninguna otra del frontend: `buscar_paseadores` y
   `solicitar_paseo` exigen `estado_verificacion = 'aprobado'`, y el
   trigger `exigir_usuario_verificado` frena las escrituras en doce
   tablas. Un paseador sin aprobar entra al panel y no aparece en
   ninguna búsqueda: nadie puede reservarle. */
const perfilesDeCuenta = (profile: UserProfile | null): RolPublico[] => {
  const roles = profile?.roles ?? [];
  return profile?.paseador && !roles.includes("paseador")
    ? [...roles, "paseador"]
    : roles;
};

const resolveActiveRole = (
  profile: UserProfile | null,
  session: Session | null,
  preferredRole?: Rol
): Rol | null => {
  const roles = perfilesDeCuenta(profile);
  const isAdmin = Boolean(profile?.isAdmin || adminFromUser(session?.user ?? null));
  const allowed: Rol[] = [...roles, ...(isAdmin ? (["admin"] as const) : [])];
  const stored = sessionStorage.getItem(ACTIVE_ROLE_KEY) as Rol | null;
  const selected = preferredRole && allowed.includes(preferredRole)
    ? preferredRole
    : stored && allowed.includes(stored)
    ? stored
    : allowed.length === 1
    ? allowed[0]
    : null;

  if (selected) sessionStorage.setItem(ACTIVE_ROLE_KEY, selected);
  else sessionStorage.removeItem(ACTIVE_ROLE_KEY);

  return selected;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    roles: [],
    isAdmin: false,
    loading: true,
    accessError: null,
  });

  const loadSession = useCallback(async (session: Session | null, preferredRole?: Rol) => {
    if (!session?.user) {
      sessionStorage.removeItem(ACTIVE_ROLE_KEY);
      setState((current) => ({
        session: null,
        user: null,
        role: null,
        roles: [],
        isAdmin: false,
        loading: false,
        accessError: current.accessError,
      }));
      return;
    }

    const profile = await getUserProfile(session.user.id, session.user.email ?? "");
    const hasAdminRole = adminFromUser(session.user);

    if (hasAdminRole && !profile) {
      await logout();
      sessionStorage.removeItem(ACTIVE_ROLE_KEY);
      setState({
        session: null,
        user: null,
        role: null,
        roles: [],
        isAdmin: false,
        loading: false,
        accessError: null,
      });
      throw new Error(
        "La cuenta admin no tiene informacion personal vinculada. Ejecuta scripts/configure-admin.mjs con ADMIN_NOMBRE.",
      );
    }

    if (profile && !profile.activo) {
      await logout();
      sessionStorage.removeItem(ACTIVE_ROLE_KEY);
      setState({
        session: null,
        user: null,
        role: null,
        roles: [],
        isAdmin: false,
        loading: false,
        accessError: INACTIVE_ACCOUNT_MESSAGE,
      });
      throw new Error(INACTIVE_ACCOUNT_MESSAGE);
    }

    const isAdmin = Boolean(profile?.isAdmin || hasAdminRole);
    setState({
      session,
      user: session.user,
      role: resolveActiveRole(profile, session, preferredRole),
      roles: perfilesDeCuenta(profile),
      isAdmin,
      loading: false,
      accessError: null,
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    getSession()
      .then((session) => {
        if (mounted) {
          void loadSession(session).catch(() => {
            if (mounted) setState((current) => ({ ...current, loading: false }));
          });
        }
      })
      .catch(() => {
        if (mounted) setState((current) => ({ ...current, loading: false }));
      });

    const { data } = onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (mounted) void loadSession(session);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [loadSession]);

  const login = async (email: string, password: string, preferredRole?: Rol) => {
    sessionStorage.removeItem(ACTIVE_ROLE_KEY);
    const { data, error } = await loginService(email, password);
    if (error) throw error;
    await loadSession(data.session, preferredRole);
  };

  const register = async (
    email: string,
    password: string,
    profile: RegistrationData
  ) => {
    const { data, error } = await registerService(email, password, profile);
    if (error) throw error;
    if (data.session) await loadSession(data.session, profile.tipo_usuario);
    return Boolean(data.session);
  };

  const resetPassword = (email: string) => resetPasswordService(email);
  const updatePassword = (password: string) => updatePasswordService(password);
  const getProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!state.user) return null;
    return getUserProfile(state.user.id, state.user.email ?? "");
  }, [state.user]);
  const updateProfile = useCallback(async (
    profile: ProfileUpdate
  ) => {
    if (!state.user) throw new Error("No hay una sesión activa");
    await updateUserProfile(state.user.id, profile);
  }, [state.user]);

  const addRole = useCallback(async (role: RolPublico) => {
    if (!state.session) throw new Error("No hay una sesiÃ³n activa");
    await addRoleToMyAccount(role);
    await loadSession(state.session, state.role ?? undefined);
  }, [loadSession, state.role, state.session]);

  const setActiveRole = useCallback((role: Rol) => {
    setState((current) => {
      const allowed: Rol[] = [
        ...current.roles,
        ...(current.isAdmin ? (["admin"] as const) : []),
      ];
      if (!allowed.includes(role)) return current;
      sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
      return { ...current, role };
    });
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, getProfile, updateProfile, addRole, setActiveRole, resetPassword, updatePassword, logout: handleLogout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
