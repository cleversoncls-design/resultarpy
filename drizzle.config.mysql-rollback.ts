import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.mysql-rollback.ts",
  out: "./drizzle-mysql-rollback",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
