import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import getDb from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth";
import { generateApiKey, hashKey } from "@/lib/crypto";

type Params = { params: Promise<{ projectId: string }> };

// GET /api/projects/:id/keys — list keys for a project
export async function GET(req: NextRequest, { params }: Params) {
  if (!authenticateAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const db = getDb();

  const keys = db.prepare(
    "SELECT id, key_prefix, label, created_at, revoked_at FROM api_keys WHERE project_id = ? ORDER BY created_at DESC"
  ).all(projectId);

  return NextResponse.json({ keys });
}

// POST /api/projects/:id/keys — generate a new API key
export async function POST(req: NextRequest, { params }: Params) {
  if (!authenticateAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const db = getDb();

  const project = db.prepare("SELECT slug FROM projects WHERE id = ?").get(projectId) as { slug: string } | undefined;
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { label = "default" } = await req.json().catch(() => ({}));

  const plainKey = generateApiKey(project.slug);
  const id = uuid();

  db.prepare(
    "INSERT INTO api_keys (id, project_id, key_hash, key_prefix, label) VALUES (?, ?, ?, ?, ?)"
  ).run(id, projectId, hashKey(plainKey), plainKey.slice(0, 16) + "...", label);

  // Return the plaintext key — this is the ONLY time it's shown
  return NextResponse.json({ id, key: plainKey, label }, { status: 201 });
}
