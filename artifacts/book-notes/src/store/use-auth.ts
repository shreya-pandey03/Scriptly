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

const initialToken = localStorage.getItem("auth-token");

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: initialToken,
  isAuthenticated: !!initialToken,
  
  setAuth: (user, token) => {
    localStorage.setItem("auth-token", token);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem("auth-token");
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  updateUser: (user) => {
    set({ user });
  }
}));
