import path from "path";

export default {
  schema: path.join(__dirname, "./src/schema/**/*.ts"),
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};