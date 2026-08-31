import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getStoredToken, setToken } from "../lib/api";

interface AuthUser {
  id: string;
  username: string;
  email: string;
  skillRating: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getStoredToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const result = await api.login(email, password);
    setToken(result.token);
    const me = await api.me();
    setUser(me);
  }

  async function signup(username: string, email: string, password: string) {
    const result = await api.signup(username, email, password);
    setToken(result.token);
    const me = await api.me();
    setUser(me);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
