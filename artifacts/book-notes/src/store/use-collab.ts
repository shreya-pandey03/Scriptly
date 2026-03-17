import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "./use-auth";

interface CollabState {
  socket: Socket | null;
  editingStatus: Record<number, string>; // noteId -> username
  connect: () => void;
  disconnect: () => void;
  startEditing: (noteId: number, username: string) => void;
  stopEditing: (noteId: number) => void;
}

export const useCollabStore = create<CollabState>((set, get) => ({
  socket: null,
  editingStatus: {},
  
  connect: () => {
    const token = useAuthStore.getState().token;
    if (!token || get().socket) return;
    
    const socket = io("/", {
      path: "/api/socket.io",
      auth: { token },
      transports: ["websocket"]
    });
    
    socket.on("connect", () => {
      console.log("Collab socket connected");
    });
    
    socket.on("editing:start", ({ noteId, username }: { noteId: number, username: string }) => {
      set((state) => ({
        editingStatus: { ...state.editingStatus, [noteId]: username }
      }));
    });
    
    socket.on("editing:stop", ({ noteId }: { noteId: number }) => {
      set((state) => {
        const newStatus = { ...state.editingStatus };
        delete newStatus[noteId];
        return { editingStatus: newStatus };
      });
    });
    
    set({ socket });
  },
  
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, editingStatus: {} });
    }
  },
  
  startEditing: (noteId: number, username: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit("editing:start", { noteId, username });
    }
  },
  
  stopEditing: (noteId: number) => {
    const { socket } = get();
    if (socket) {
      socket.emit("editing:stop", { noteId });
    }
  }
}));
