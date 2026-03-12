import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import getDb, { initDb } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth";
import { generateApiKey, hashKey } from "@/lib/crypto";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!(await authenticateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  await initDb();
  const sql = getDb();

  const keys = await sql`
    SELECT id, key_prefix, label, created_at, revoked_at
    FROM api_keys WHERE project_id = ${projectId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await authenticateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  await initDb();
  const sql = getDb();

  const projects = await sql`SELECT slug FROM projects WHERE id = ${projectId}`;
  if (projects.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { label = "default" } = await req.json().catch(() => ({}));
  const plainKey = generateApiKey(projects[0].slug);
  const id = uuid();

  await sql`
    INSERT INTO api_keys (id, project_id, key_hash, key_prefix, label)
    VALUES (${id}, ${projectId}, ${hashKey(plainKey)}, ${plainKey.slice(0, 16) + "..."}, ${label})
  `;

  return NextResponse.json({ id, key: plainKey, label }, { status: 201 });
}
