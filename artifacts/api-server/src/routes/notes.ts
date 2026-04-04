import { Router, type IRouter } from "express";
import { db, notesTable, booksTable } from "@workspace/db";
import { eq, and, ilike, asc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import type { Server as SocketServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var io: SocketServer | undefined;
}

const router: IRouter = Router({ mergeParams: true });

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = Number(req.params["bookId"]);
    if (!Number.isInteger(bookId)) {
      res.status(400).json({ error: "Invalid book ID" });
      return;
    }

    const search = (req.query["search"] as string | undefined)?.trim();

    const [book] = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, req.user!.userId)))
      .limit(1);

    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const notes = await db
      .select()
      .from(notesTable)
      .where(
        search
          ? and(
              eq(notesTable.bookId, bookId),
              ilike(notesTable.content, `%${search}%`)
            )
          : eq(notesTable.bookId, bookId)
      )
      .orderBy(asc(notesTable.chapterNumber), asc(notesTable.createdAt));

    res.json(notes.map((n) => ({ ...n, editingBy: null })));
  } catch (err) {
    console.error("Get notes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = Number(req.params["bookId"]);
    if (!Number.isInteger(bookId)) {
      res.status(400).json({ error: "Invalid book ID" });
      return;
    }

    const [book] = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, req.user!.userId)))
      .limit(1);

    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    let { chapter, chapterNumber, content } = req.body;

    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    content = content.trim();

    const [note] = await db
      .insert(notesTable)
      .values({
        bookId,
        userId: req.user!.userId,
        chapter: chapter ?? null,
        chapterNumber: chapterNumber ?? null,
        content,
      })
      .returning();

    global.io?.to(`book-${bookId}`).emit("note:created", {
      bookId,
      noteId: note.id,
      username: req.user!.username,
    });

    res.status(201).json({ ...note, editingBy: null });
  } catch (err) {
    console.error("Create note error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:noteId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = Number(req.params["bookId"]);
    const noteId = Number(req.params["noteId"]);

    if (!Number.isInteger(bookId) || !Number.isInteger(noteId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [note] = await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.id, noteId), eq(notesTable.bookId, bookId)))
      .limit(1);

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json({ ...note, editingBy: null });
  } catch (err) {
    console.error("Get note error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:noteId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = Number(req.params["bookId"]);
    const noteId = Number(req.params["noteId"]);

    if (!Number.isInteger(bookId) || !Number.isInteger(noteId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.id, noteId), eq(notesTable.bookId, bookId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    let { chapter, chapterNumber, content } = req.body;

    const [updated] = await db
      .update(notesTable)
      .set({
        ...(chapter !== undefined && { chapter }),
        ...(chapterNumber !== undefined && { chapterNumber }),
        ...(content !== undefined && { content: content.trim() }),
        updatedAt: new Date(),
      })
      .where(eq(notesTable.id, noteId))
      .returning();

    global.io?.to(`book-${bookId}`).emit("note:updated", {
      bookId,
      noteId,
      username: req.user!.username,
    });

    res.json({ ...updated, editingBy: null });
  } catch (err) {
    console.error("Update note error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:noteId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = Number(req.params["bookId"]);
    const noteId = Number(req.params["noteId"]);

    if (!Number.isInteger(bookId) || !Number.isInteger(noteId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.id, noteId), eq(notesTable.bookId, bookId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    await db.delete(notesTable).where(eq(notesTable.id, noteId));

    global.io?.to(`book-${bookId}`).emit("note:deleted", {
      bookId,
      noteId,
      username: req.user!.username,
    });

    res.status(204).send();
  } catch (err) {
    console.error("Delete note error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;