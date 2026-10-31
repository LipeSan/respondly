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
    url: directNeonUrl(
      process.env.DATABASE_URL_UNPOOLED ??
        process.env.POSTGRES_URL_NON_POOLING ??
        process.env.DATABASE_URL ??
        process.env.POSTGRES_URL ??
        env("DATABASE_URL")
    ),
  },
});

// The *_UNPOOLED variables have pointed at the pooler host too, which leaves
// the migrate lock stuck in a pgbouncer connection. Neon's direct host is the
// same name without "-pooler", so always migrate over that.
function directNeonUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.replace(/-pooler(?=\.[^.]+\.aws\.neon\.tech$)/, "");
    return parsed.toString();
  } catch {
    return url;
  }
}
