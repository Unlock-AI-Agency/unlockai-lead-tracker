import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth";

type Params = { params: Promise<{ projectId: string; keyId: string }> };

// PATCH /api/projects/:projectId/keys/:keyId — revoke a key
export async function PATCH(req: NextRequest, { params }: Params) {
  if (!authenticateAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyId } = await params;
  const db = getDb();

  db.prepare(
    "UPDATE api_keys SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL"
  ).run(keyId);

  return NextResponse.json({ success: true });
}
