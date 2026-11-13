// Encrypts the Google OAuth tokens still stored as plaintext in GoogleConnection.
// Safe to run more than once: rows already encrypted are skipped.
//
// Usage (needs DATABASE_URL and TOKEN_ENCRYPTION_KEY):
//   node --env-file=.env.prod scripts/encrypt-google-tokens.mjs --dry-run
//   node --env-file=.env.prod scripts/encrypt-google-tokens.mjs
//
// Rollback (back to plaintext, e.g. before reverting the deploy):
//   node --env-file=.env.prod scripts/encrypt-google-tokens.mjs --decrypt
//
// Each row is updated only if its tokens did not change since it was read, so a token
// refresh happening at the same time is never overwritten.

import pg from "pg";
import { decryptToken, encryptToken, isEncryptedToken } from "../src/lib/tokenCrypto.ts";

const dryRun = process.argv.includes("--dry-run");
const decrypt = process.argv.includes("--decrypt");

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
if (!process.env.TOKEN_ENCRYPTION_KEY) throw new Error("TOKEN_ENCRYPTION_KEY is not set");

const transform = decrypt ? decryptToken : encryptToken;
const needsChange = (v) => (decrypt ? isEncryptedToken(v) : Boolean(v) && !isEncryptedToken(v));

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT "id", "accessToken", "refreshToken" FROM "GoogleConnection"`,
  );

  let changed = 0;
  let skipped = 0;
  let raced = 0;
  let failed = 0;

  for (const row of rows) {
    if (!needsChange(row.accessToken) && !needsChange(row.refreshToken)) {
      skipped++;
      continue;
    }

    const accessToken = transform(row.accessToken);
    const refreshToken = transform(row.refreshToken);

    // Round-trip check before writing: the plaintext must be identical before and after.
    // (A row can be half-migrated, e.g. accessToken already encrypted by a token refresh.)
    if (
      decryptToken(accessToken) !== decryptToken(row.accessToken) ||
      decryptToken(refreshToken) !== decryptToken(row.refreshToken)
    ) {
      console.error(`Round-trip check failed for GoogleConnection ${row.id}; left unchanged`);
      failed++;
      continue;
    }

    if (dryRun) {
      changed++;
      continue;
    }

    const res = await client.query(
      `UPDATE "GoogleConnection"
          SET "accessToken" = $1, "refreshToken" = $2
        WHERE "id" = $3 AND "accessToken" = $4 AND "refreshToken" = $5`,
      [accessToken, refreshToken, row.id, row.accessToken, row.refreshToken],
    );
    if (res.rowCount === 1) changed++;
    else raced++;
  }

  const verb = decrypt ? "decrypted" : "encrypted";
  console.log(
    `${dryRun ? "[dry-run] would have " : ""}${verb}: ${changed}, already ok: ${skipped}` +
      (raced ? `, changed concurrently (run again): ${raced}` : "") +
      (failed ? `, FAILED (left unchanged): ${failed}` : "") +
      `, total: ${rows.length}`,
  );
  if (failed) process.exitCode = 1;
} finally {
  await client.end();
}
