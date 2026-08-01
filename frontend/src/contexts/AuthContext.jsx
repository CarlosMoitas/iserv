import { createContext, useContext, useMemo, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

const storageKey = "iserv.auth";

function readStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  function saveAuth(value) {
    setAuth(value);
    if (value) {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } else {
      localStorage.removeItem(storageKey);
    }
  }

  async function login(credentials) {
    const { data } = await api.post("/auth/login", credentials);
    saveAuth(data);
    return data;
  }

  async function register(payload) {
    const { data } = await api.post("/auth/register", payload);
    saveAuth(data);
    return data;
  }

  function logout() {
    saveAuth(null);
  }

  const value = useMemo(
    () => ({
      token: auth?.token || null,
      user: auth?.user || null,
      isAuthenticated: Boolean(auth?.token),
      login,
      register,
      logout,
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
