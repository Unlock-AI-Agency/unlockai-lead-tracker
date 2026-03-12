import { NextRequest } from "next/server";
import getDb, { initDb } from "./db";
import { hashKey } from "./crypto";

type ApiKeyAuth = {
  valid: true;
  projectId: string;
  projectSlug: string;
} | {
  valid: false;
};

export async function authenticate(req: NextRequest): Promise<ApiKeyAuth> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return { valid: false };

  await initDb();
  const sql = getDb();
  const hash = hashKey(apiKey);

  const rows = await sql`
    SELECT ak.project_id, p.slug
    FROM api_keys ak
    JOIN projects p ON p.id = ak.project_id
    WHERE ak.key_hash = ${hash} AND ak.revoked_at IS NULL
  `;

  if (rows.length === 0) return { valid: false };

  return { valid: true, projectId: rows[0].project_id, projectSlug: rows[0].slug };
}

export async function authenticateAdmin(req: NextRequest): Promise<boolean> {
  // 1. Check legacy admin secret header
  const secret = req.headers.get("x-admin-secret");
  const expected = process.env.ADMIN_SECRET;
  if (expected && secret && secret === expected) return true;

  // 2. Check session cookie
  const sessionId = req.cookies.get("lt_session")?.value;
  if (!sessionId) return false;

  await initDb();
  const sql = getDb();
  const rows = await sql`
    SELECT u.id
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sessionId} AND s.expires_at > now() AND u.verified = 1
  `;

  return rows.length > 0;
}
