import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../../lib/db/src/schema",
  out: "./drizzle",
  dialect: "postgresql",   // ✅ FIXED (IMPORTANT)
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",  // ✅ also changed key
  },
});