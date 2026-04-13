import "dotenv/config";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import app from "./app.js";
import { verifyToken } from "./lib/jwt.js";

declare global {
  // eslint-disable-next-line no-var
  var io: SocketServer | undefined;
}

// ✅ Validate PORT
const rawPort = process.env.PORT;
if (!rawPort) throw new Error("PORT environment variable is required.");

const port = Number(rawPort);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ✅ Create HTTP server
const httpServer = createServer(app);

// ✅ Attach Socket.IO to SAME server
const io = new SocketServer(httpServer, {
  path: "/api/socket.io", // ⚠️ MUST match frontend
  cors: {
    origin: "http://localhost:3000", // 🔥 better than origin: true
    methods: ["GET", "POST"],
    credentials: true,
  },
});

global.io = io;

// 🔐 Auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;

  console.log("🔐 Incoming token:", token); // ✅ debug

  if (!token) {
    console.log("❌ Missing token");
    return next(new Error("Authentication error: missing token"));
  }

  try {
    const payload = verifyToken(token);
    (socket as any).user = payload;
    return next();
  } catch {
    console.log("❌ Invalid token");
    return next(new Error("Authentication error: invalid token"));
  }
});

// 📦 State
const editingMap = new Map<number, string>();

const bookPresence = new Map<
  number,
  Map<string, { userId: number; username: string }>
>();

function getBookPresenceList(bookId: number) {
  const room = bookPresence.get(bookId);
  if (!room) return [];
  return Array.from(room.values());
}

// 🔌 Socket connection
io.on("connection", (socket) => {
  const user = (socket as any).user as {
    userId: number;
    username: string;
    email: string;
  };

  console.log(`🟢 Socket connected: ${user?.username} (${socket.id})`);

  // ✏️ Editing
  socket.on("editing:start", ({ noteId }: { noteId: number }) => {
    if (!noteId || !user) return;

    editingMap.set(noteId, user.username);

    socket.broadcast.emit("editing:start", {
      noteId,
      username: user.username,
    });
  });

  socket.on("editing:stop", ({ noteId }: { noteId: number }) => {
    if (!noteId) return;

    editingMap.delete(noteId);

    socket.broadcast.emit("editing:stop", { noteId });
  });

  // 📚 Join book
  socket.on("book:join", ({ bookId }: { bookId: number }) => {
    if (!bookId || !user) return;

    const roomName = `book-${bookId}`;
    socket.join(roomName);

    if (!bookPresence.has(bookId)) {
      bookPresence.set(bookId, new Map());
    }

    bookPresence
      .get(bookId)!
      .set(socket.id, { userId: user.userId, username: user.username });

    io.to(roomName).emit("presence:update", {
      bookId,
      users: getBookPresenceList(bookId),
    });
  });

  // 🚪 Leave book
  socket.on("book:leave", ({ bookId }: { bookId: number }) => {
    if (!bookId) return;

    const roomName = `book-${bookId}`;
    socket.leave(roomName);

    bookPresence.get(bookId)?.delete(socket.id);

    io.to(roomName).emit("presence:update", {
      bookId,
      users: getBookPresenceList(bookId),
    });
  });

  // 🔌 Disconnect
  socket.on("disconnect", () => {
    console.log(`🔴 Socket disconnected: ${user?.username} (${socket.id})`);

    // cleanup editing
    for (const [noteId, username] of editingMap.entries()) {
      if (username === user?.username) {
        editingMap.delete(noteId);
        socket.broadcast.emit("editing:stop", { noteId });
      }
    }

    // cleanup presence
    for (const [bookId, room] of bookPresence.entries()) {
      if (room.has(socket.id)) {
        room.delete(socket.id);

        const roomName = `book-${bookId}`;

        io.to(roomName).emit("presence:update", {
          bookId,
          users: getBookPresenceList(bookId),
        });
      }
    }
  });
});

// ✅ Health route
app.get("/", (_req, res) => {
  res.send("API is running");
});

// ✅ Start server
httpServer.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});