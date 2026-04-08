import { create } from "zustand";
import type { User } from "@workspace/api-client-react";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const getInitialToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth-token");
};

export const useAuthStore = create<AuthState>((set) => {
  const initialToken = getInitialToken();

  return {
    user: null,
    token: initialToken,
    isAuthenticated: !!initialToken,

    setAuth: (user, token) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("auth-token", token);
      }
      set({ user, token, isAuthenticated: true });
    },

    logout: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-token");
      }
      set({ user: null, token: null, isAuthenticated: false });
    },

    updateUser: (user) => {
      set({ user });
    },
  };
});