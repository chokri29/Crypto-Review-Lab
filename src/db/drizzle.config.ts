import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file.
dotenv.config();

let host = process.env.SQL_HOST || process.env.PGHOST || process.env.POSTGRES_HOST;
let database = process.env.SQL_DB_NAME || process.env.PGDATABASE || process.env.POSTGRES_DATABASE;
let user = process.env.SQL_ADMIN_USER || process.env.SQL_USER || process.env.PGUSER || process.env.POSTGRES_USER;
let password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
let port = parseInt(process.env.SQL_PORT || process.env.PGPORT || process.env.POSTGRES_PORT || "5432", 10);

if (!host) {
  const rawUrl =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (rawUrl && rawUrl.trim()) {
    try {
      const parsed = new URL(rawUrl.trim());
      host = parsed.hostname || host;
      user = parsed.username ? decodeURIComponent(parsed.username) : user;
      password = parsed.password ? decodeURIComponent(parsed.password) : password;
      const dbPath = parsed.pathname.replace(/^\/+/, "");
      if (dbPath) database = dbPath;
      if (parsed.port) port = parseInt(parsed.port, 10);
    } catch {
      // Ignore invalid URL
    }
  }
}

host = host || "127.0.0.1";
database = database || "postgres";
user = user || "postgres";
password = password || "";

const isLocalOrSocket = host.startsWith("/") || host === "127.0.0.1" || host === "localhost";
const useSsl = process.env.SQL_SSL === "true" || (!isLocalOrSocket && process.env.SQL_SSL !== "false");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle", // Output directory for migrations.
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host,
    port: Number.isFinite(port) ? port : 5432,
    user,
    password,
    database,
    ssl: useSsl ? "require" : false,
  },
  verbose: true, // Enable verbose output.
});

