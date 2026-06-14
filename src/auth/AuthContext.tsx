import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { User } from "../types";
import * as api from "../api";

interface AuthContextValue {
  user: User | null;
  /** True while the initial session-restore (refresh cookie) is in flight. */
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Holds the authenticated user in React state. The access token itself lives
 * in api.ts module memory (never localStorage), and is transparently refreshed
 * by the HTTP layer. On mount we attempt to restore the session from the
 * HttpOnly refresh cookie so a page reload doesn't force re-login.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Let the HTTP layer force a logout when a refresh ultimately fails.
    api.setAuthFailureHandler(() => setUser(null));

    let active = true;
    api
      .bootstrapSession()
      .then((restored) => {
        if (active) setUser(restored);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      isAdmin: user?.role === "admin",
      login: async (email, password) => {
        setUser(await api.login(email, password));
      },
      logout: async () => {
        await api.logout();
        setUser(null);
      },
    }),
    [user, loading]
  );

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
