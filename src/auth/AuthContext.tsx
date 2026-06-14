import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { login as apiLogin, setAuthToken } from "../api";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Holds the active session in memory (React state) instead of reading raw,
 * easily-tampered strings out of localStorage. Structural access-control
 * decisions (e.g. isAdmin) read from this state.
 *
 * NOTE: This is defense-in-depth for the UI only. The browser is never a
 * trust boundary — the backend must independently enforce authentication and
 * authorization on every request. A user can still edit in-memory state via
 * devtools; the point is simply not to ship a trivially-guessable
 * `localStorage.role = "admin"` switch.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      isAuthenticated: user !== null,
      isAdmin: user?.role === "admin",
      login: async (email: string, password: string) => {
        const data = await apiLogin(email, password);
        // Token lives in api.ts module memory; role/user lives here.
        setAuthToken(data.token ?? null);
        setUser(data.user ?? null);
      },
      logout: () => {
        setAuthToken(null);
        setUser(null);
      },
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook is intentionally co-located with its provider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
