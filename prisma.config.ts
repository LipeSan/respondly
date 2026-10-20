import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // The CLI (migrate deploy) needs a direct connection: Neon's pooler can't hold
  // the advisory lock Prisma takes, so builds time out with P1002. The app
  // itself keeps using the pooled DATABASE_URL (src/lib/db.ts).
  datasource: {
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      env("DATABASE_URL"),
  },
});
