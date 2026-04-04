import { Router, type IRouter } from "express";
import { db, booksTable, notesTable, quotesTable } from "@workspace/db";
import { eq, and, ilike, or, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const search = (req.query["search"] as string | undefined)?.trim();
    const userId = req.user!.userId;

    const baseQuery = db
      .select({
        id: booksTable.id,
        title: booksTable.title,
        author: booksTable.author,
        description: booksTable.description,
        coverColor: booksTable.coverColor,
        userId: booksTable.userId,
        createdAt: booksTable.createdAt,
        updatedAt: booksTable.updatedAt,
      })
      .from(booksTable);

    const books = search
      ? await baseQuery.where(
          and(
            eq(booksTable.userId, userId),
            or(
              ilike(booksTable.title, `%${search}%`),
              ilike(booksTable.author, `%${search}%`)
            )
          )
        )
      : await baseQuery.where(eq(booksTable.userId, userId));

    const booksWithCounts = await Promise.all(
      books.map(async (book) => {
        const [noteCountResult] = await db
          .select({ count: count() })
          .from(notesTable)
          .where(eq(notesTable.bookId, book.id));

        const [quoteCountResult] = await db
          .select({ count: count() })
          .from(quotesTable)
          .where(eq(quotesTable.bookId, book.id));

        return {
          ...book,
          noteCount: Number(noteCountResult?.count ?? 0),
          quoteCount: Number(quoteCountResult?.count ?? 0),
        };
      })
    );

    res.json(booksWithCounts);
  } catch (err) {
    console.error("Get books error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    let { title, author, description, coverColor } = req.body;

    if (!title || !author) {
      res.status(400).json({ error: "title and author are required" });
      return;
    }

    title = title.trim();
    author = author.trim();

    const [book] = await db
      .insert(booksTable)
      .values({
        title,
        author,
        description: description ?? null,
        coverColor: coverColor ?? null,
        userId: req.user!.userId,
      })
      .returning();

    res.status(201).json({ ...book, noteCount: 0, quoteCount: 0 });
  } catch (err) {
    console.error("Create book error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:bookId", requireAuth, async (req: AuthRequest, res) => {
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

    const [noteCountResult] = await db
      .select({ count: count() })
      .from(notesTable)
      .where(eq(notesTable.bookId, book.id));

    const [quoteCountResult] = await db
      .select({ count: count() })
      .from(quotesTable)
      .where(eq(quotesTable.bookId, book.id));

    res.json({
      ...book,
      noteCount: Number(noteCountResult?.count ?? 0),
      quoteCount: Number(quoteCountResult?.count ?? 0),
    });
  } catch (err) {
    console.error("Get book error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:bookId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = Number(req.params["bookId"]);
    if (!Number.isInteger(bookId)) {
      res.status(400).json({ error: "Invalid book ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, req.user!.userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    let { title, author, description, coverColor } = req.body;

    const [updated] = await db
      .update(booksTable)
      .set({
        ...(title !== undefined && { title: title.trim() }),
        ...(author !== undefined && { author: author.trim() }),
        ...(description !== undefined && { description }),
        ...(coverColor !== undefined && { coverColor }),
        updatedAt: new Date(),
      })
      .where(eq(booksTable.id, bookId))
      .returning();

    const [noteCountResult] = await db
      .select({ count: count() })
      .from(notesTable)
      .where(eq(notesTable.bookId, bookId));

    const [quoteCountResult] = await db
      .select({ count: count() })
      .from(quotesTable)
      .where(eq(quotesTable.bookId, bookId));

    res.json({
      ...updated,
      noteCount: Number(noteCountResult?.count ?? 0),
      quoteCount: Number(quoteCountResult?.count ?? 0),
    });
  } catch (err) {
    console.error("Update book error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:bookId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookId = Number(req.params["bookId"]);
    if (!Number.isInteger(bookId)) {
      res.status(400).json({ error: "Invalid book ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, req.user!.userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    await db.delete(booksTable).where(eq(booksTable.id, bookId));

    res.status(204).send();
  } catch (err) {
    console.error("Delete book error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;