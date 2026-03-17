import { Router, type IRouter } from "express";
import { db, notesTable, quotesTable, booksTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const q = req.query["q"] as string;

    if (!q) {
      res.status(400).json({ error: "q query parameter is required" });
      return;
    }

    const userId = req.user!.userId;

    const userBooks = await db
      .select({ id: booksTable.id })
      .from(booksTable)
      .where(eq(booksTable.userId, userId));

    const bookIds = userBooks.map((b) => b.id);

    if (bookIds.length === 0) {
      res.json({ notes: [], quotes: [] });
      return;
    }

    const notesResults = await db
      .select({
        id: notesTable.id,
        bookId: notesTable.bookId,
        bookTitle: booksTable.title,
        chapter: notesTable.chapter,
        content: notesTable.content,
      })
      .from(notesTable)
      .innerJoin(booksTable, eq(notesTable.bookId, booksTable.id))
      .where(and(eq(booksTable.userId, userId), ilike(notesTable.content, `%${q}%`)))
      .limit(20);

    const quotesResults = await db
      .select({
        id: quotesTable.id,
        bookId: quotesTable.bookId,
        bookTitle: booksTable.title,
        text: quotesTable.text,
        page: quotesTable.page,
      })
      .from(quotesTable)
      .innerJoin(booksTable, eq(quotesTable.bookId, booksTable.id))
      .where(and(eq(booksTable.userId, userId), ilike(quotesTable.text, `%${q}%`)))
      .limit(20);

    res.json({ notes: notesResults, quotes: quotesResults });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
