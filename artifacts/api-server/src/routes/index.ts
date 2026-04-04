import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import booksRouter from "./books.js";
import notesRouter from "./notes.js";
import quotesRouter from "./quotes.js";
import searchRouter from "./search.js";

const router: IRouter = Router();

router.use("/", healthRouter);
router.use("/auth", authRouter);
router.use("/books", booksRouter);
router.use("/books/:bookId/notes", notesRouter);
router.use("/books/:bookId/quotes", quotesRouter);
router.use("/search", searchRouter);

export default router;