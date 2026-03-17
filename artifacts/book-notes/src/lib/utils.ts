import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAuthHeaders() {
  const token = localStorage.getItem("auth-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Preset colors for book covers and quotes
export const BOOK_COLORS = [
  "#d97757", // Rust
  "#2a9d8f", // Teal
  "#264653", // Deep Blue
  "#e9c46a", // Mustard
  "#8ab17d", // Sage
  "#8e7dbe", // Muted Purple
  "#c47c7c", // Dusty Rose
  "#6b705c", // Olive
];
