import { NextRequest, NextResponse } from "next/server";
import getDb, { initDb } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth";

type Params = { params: Promise<{ projectId: string; keyId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await authenticateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyId } = await params;
  await initDb();
  const sql = getDb();

  await sql`UPDATE api_keys SET revoked_at = now() WHERE id = ${keyId} AND revoked_at IS NULL`;

  return NextResponse.json({ success: true });
}
