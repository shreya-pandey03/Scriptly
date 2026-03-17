import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import app from "./app.js";
import { verifyToken } from "./lib/jwt.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  path: "/api/socket.io",
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

global.io = io;

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    next(new Error("Authentication error: missing token"));
    return;
  }
  try {
    const payload = verifyToken(token);
    (socket as typeof socket & { user: typeof payload }).user = payload;
    next();
  } catch {
    next(new Error("Authentication error: invalid token"));
  }
});

const editingMap = new Map<number, string>();

io.on("connection", (socket) => {
  const user = (socket as typeof socket & { user: { userId: number; username: string } }).user;
  console.log(`Socket connected: ${user?.username ?? "unknown"}`);

  socket.on("editing:start", ({ noteId }: { noteId: number }) => {
    if (!noteId || !user) return;
    editingMap.set(noteId, user.username);
    socket.broadcast.emit("editing:start", { noteId, username: user.username });
  });

  socket.on("editing:stop", ({ noteId }: { noteId: number }) => {
    if (!noteId) return;
    editingMap.delete(noteId);
    socket.broadcast.emit("editing:stop", { noteId });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${user?.username ?? "unknown"}`);
    for (const [noteId, username] of editingMap.entries()) {
      if (username === user?.username) {
        editingMap.delete(noteId);
        socket.broadcast.emit("editing:stop", { noteId });
      }
    }
  });
});

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port} with Socket.IO`);
});
