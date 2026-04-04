import { Router, type IRouter } from "express";
import { db, quotesTable, booksTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
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

    const quotes = search
      ? await db
          .select()
          .from(quotesTable)
          .where(
            and(
              eq(quotesTable.bookId, bookId),
              ilike(quotesTable.text, `%${search}%`)
            )
          )
      : await db.select().from(quotesTable).where(eq(quotesTable.bookId, bookId));

    res.json(quotes);
  } catch (err) {
    console.error("Get quotes error:", err);
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

    let { text, page, chapter, color } = req.body;

    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    text = text.trim();

    const [quote] = await db
      .insert(quotesTable)
      .values({
        bookId,
        userId: req.user!.userId,
        text,
        page: page ?? null,
        chapter: chapter ?? null,
        color: color ?? "amber",
      })
      .returning();

    global.io?.to(`book-${bookId}`).emit("quote:created", {
      bookId,
      quoteId: quote.id,
      username: req.user!.username,
    });

    res.status(201).json(quote);
  } catch (err) {
    console.error("Create quote error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:quoteId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = Number(req.params["bookId"]);
    const quoteId = Number(req.params["quoteId"]);

    if (!Number.isInteger(bookId) || !Number.isInteger(quoteId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(quotesTable)
      .where(and(eq(quotesTable.id, quoteId), eq(quotesTable.bookId, bookId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }

    let { text, page, chapter, color } = req.body;

    const [updated] = await db
      .update(quotesTable)
      .set({
        ...(text !== undefined && { text: text.trim() }),
        ...(page !== undefined && { page }),
        ...(chapter !== undefined && { chapter }),
        ...(color !== undefined && { color }),
      })
      .where(eq(quotesTable.id, quoteId))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error("Update quote error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:quoteId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = Number(req.params["bookId"]);
    const quoteId = Number(req.params["quoteId"]);

    if (!Number.isInteger(bookId) || !Number.isInteger(quoteId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(quotesTable)
      .where(and(eq(quotesTable.id, quoteId), eq(quotesTable.bookId, bookId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }

    await db.delete(quotesTable).where(eq(quotesTable.id, quoteId));

    global.io?.to(`book-${bookId}`).emit("quote:deleted", {
      bookId,
      quoteId,
      username: req.user!.username,
    });

    res.status(204).send();
  } catch (err) {
    console.error("Delete quote error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;