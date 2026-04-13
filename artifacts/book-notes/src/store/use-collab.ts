import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "./use-auth";

export interface PresenceUser {
  username: string;
  userId: number;
}

interface CollabState {
  socket: Socket | null;
  editingStatus: Record<number, string>;
  presenceByBook: Record<number, PresenceUser[]>;
  onNoteChange: ((bookId: number) => void) | null;
  onQuoteChange: ((bookId: number) => void) | null;
  onNoteActivity: ((msg: string) => void) | null;

  connect: () => void;
  disconnect: () => void;
  startEditing: (noteId: number) => void;
  stopEditing: (noteId: number) => void;
  joinBook: (bookId: number) => void;
  leaveBook: (bookId: number) => void;
  setNoteChangeHandler: (fn: (bookId: number) => void) => void;
  setQuoteChangeHandler: (fn: (bookId: number) => void) => void;
  setNoteActivityHandler: (fn: (msg: string) => void) => void;
}

export const useCollabStore = create<CollabState>((set, get) => ({
  socket: null,
  editingStatus: {},
  presenceByBook: {},
  onNoteChange: null,
  onQuoteChange: null,
  onNoteActivity: null,

  connect: () => {
    if (typeof window === "undefined") return;

    const token = useAuthStore.getState().token;

    // ❗ prevent multiple connections
    if (!token || get().socket) return;

    const socket = io("http://localhost:5001", {
       path: "/api/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on("connect", () => {
      console.log("🟢 Socket connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log(" Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error(" Socket error:", err.message);
    });

    // Editing
    socket.on("editing:start", ({ noteId, username }) => {
      set((state) => ({
        editingStatus: { ...state.editingStatus, [noteId]: username },
      }));
    });

    socket.on("editing:stop", ({ noteId }) => {
      set((state) => {
        const next = { ...state.editingStatus };
        delete next[noteId];
        return { editingStatus: next };
      });
    });

    // Presence
    socket.on("presence:update", ({ bookId, users }) => {
      set((state) => ({
        presenceByBook: { ...state.presenceByBook, [bookId]: users },
      }));
    });

    // Notes
    socket.on("note:created", ({ bookId, username }) => {
      get().onNoteChange?.(bookId);
      get().onNoteActivity?.(`${username} added a new note`);
    });

    socket.on("note:updated", ({ bookId, username }) => {
      get().onNoteChange?.(bookId);
      get().onNoteActivity?.(`${username} updated a note`);
    });

    socket.on("note:deleted", ({ bookId, username }) => {
      get().onNoteChange?.(bookId);
      get().onNoteActivity?.(`${username} deleted a note`);
    });

    // Quotes
    socket.on("quote:created", ({ bookId, username }) => {
      get().onQuoteChange?.(bookId);
      get().onNoteActivity?.(`${username} highlighted a quote`);
    });

    socket.on("quote:deleted", ({ bookId, username }) => {
      get().onQuoteChange?.(bookId);
      get().onNoteActivity?.(`${username} removed a quote`);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({
        socket: null,
        editingStatus: {},
        presenceByBook: {},
      });
    }
  },

  startEditing: (noteId) => {
    const { socket } = get();
    if (socket) socket.emit("editing:start", { noteId });
  },

  stopEditing: (noteId) => {
    const { socket } = get();
    if (socket) socket.emit("editing:stop", { noteId });
  },

  joinBook: (bookId) => {
    const { socket } = get();
    if (socket) socket.emit("book:join", { bookId });
  },

  leaveBook: (bookId) => {
    const { socket } = get();
    if (socket) socket.emit("book:leave", { bookId });
  },

  setNoteChangeHandler: (fn) => set({ onNoteChange: fn }),
  setQuoteChangeHandler: (fn) => set({ onQuoteChange: fn }),
  setNoteActivityHandler: (fn) => set({ onNoteActivity: fn }),
}));