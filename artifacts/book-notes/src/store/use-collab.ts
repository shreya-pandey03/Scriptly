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
    const token = useAuthStore.getState().token;
    if (!token || get().socket?.connected) return;

    const socket = io("/", {
      path: "/api/socket.io",
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Collab socket connected");
    });

    socket.on("disconnect", () => {
      console.log("Collab socket disconnected");
    });

    // Editing indicators
    socket.on("editing:start", ({ noteId, username }: { noteId: number; username: string }) => {
      set((state) => ({
        editingStatus: { ...state.editingStatus, [noteId]: username },
      }));
    });

    socket.on("editing:stop", ({ noteId }: { noteId: number }) => {
      set((state) => {
        const next = { ...state.editingStatus };
        delete next[noteId];
        return { editingStatus: next };
      });
    });

    // Presence in a book room
    socket.on("presence:update", ({ bookId, users }: { bookId: number; users: PresenceUser[] }) => {
      set((state) => ({
        presenceByBook: { ...state.presenceByBook, [bookId]: users },
      }));
    });

    // Real-time note changes (other users created/updated/deleted)
    socket.on("note:created", ({ bookId, username }: { bookId: number; username: string }) => {
      get().onNoteChange?.(bookId);
      get().onNoteActivity?.(`${username} added a new note`);
    });

    socket.on("note:updated", ({ bookId, username }: { bookId: number; username: string }) => {
      get().onNoteChange?.(bookId);
      get().onNoteActivity?.(`${username} updated a note`);
    });

    socket.on("note:deleted", ({ bookId, username }: { bookId: number; username: string }) => {
      get().onNoteChange?.(bookId);
      get().onNoteActivity?.(`${username} deleted a note`);
    });

    // Real-time quote changes
    socket.on("quote:created", ({ bookId, username }: { bookId: number; username: string }) => {
      get().onQuoteChange?.(bookId);
      get().onNoteActivity?.(`${username} highlighted a new quote`);
    });

    socket.on("quote:deleted", ({ bookId, username }: { bookId: number; username: string }) => {
      get().onQuoteChange?.(bookId);
      get().onNoteActivity?.(`${username} removed a quote`);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, editingStatus: {}, presenceByBook: {} });
    }
  },

  startEditing: (noteId: number) => {
    const { socket } = get();
    const user = useAuthStore.getState().user;
    if (socket && user) {
      socket.emit("editing:start", { noteId, username: user.username });
    }
  },

  stopEditing: (noteId: number) => {
    const { socket } = get();
    if (socket) {
      socket.emit("editing:stop", { noteId });
    }
  },

  joinBook: (bookId: number) => {
    const { socket } = get();
    if (socket) {
      socket.emit("book:join", { bookId });
    }
  },

  leaveBook: (bookId: number) => {
    const { socket } = get();
    if (socket) {
      socket.emit("book:leave", { bookId });
    }
  },

  setNoteChangeHandler: (fn) => set({ onNoteChange: fn }),
  setQuoteChangeHandler: (fn) => set({ onQuoteChange: fn }),
  setNoteActivityHandler: (fn) => set({ onNoteActivity: fn }),
}));
