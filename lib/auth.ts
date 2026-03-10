import { NextRequest } from "next/server";
import getDb from "./db";
import { hashKey } from "./crypto";

type ApiKeyAuth = {
  valid: true;
  projectId: string;
  projectSlug: string;
} | {
  valid: false;
};

export function authenticate(req: NextRequest): ApiKeyAuth {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return { valid: false };

  const db = getDb();
  const hash = hashKey(apiKey);

  const row = db.prepare(`
    SELECT ak.project_id, p.slug
    FROM api_keys ak
    JOIN projects p ON p.id = ak.project_id
    WHERE ak.key_hash = ? AND ak.revoked_at IS NULL
  `).get(hash) as { project_id: string; slug: string } | undefined;

  if (!row) return { valid: false };

  return { valid: true, projectId: row.project_id, projectSlug: row.slug };
}

export function authenticateAdmin(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  const expected = process.env.ADMIN_SECRET;
  if (!expected || !secret) return false;
  return secret === expected;
}
