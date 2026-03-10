import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import getDb from "@/lib/db";
import { authenticate, authenticateAdmin } from "@/lib/auth";

// POST /api/leads — record a new lead (API key auth)
export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!auth.valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { source = "quote_form", name, email, phone, type, metadata } = body;

    const id = uuid();
    const db = getDb();

    db.prepare(`
      INSERT INTO leads (id, project_id, client_id, source, name, email, phone, type, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      auth.projectId,
      auth.projectSlug,
      source,
      name ?? null,
      email ?? null,
      phone ?? null,
      type ?? null,
      metadata ? JSON.stringify(metadata) : null
    );

    return NextResponse.json({ id, status: "recorded" }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// GET /api/leads — list recent leads (API key or admin auth)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const db = getDb();

  let projectId: string;

  // Admin can query any project
  if (authenticateAdmin(req)) {
    const pid = searchParams.get("projectId");
    if (!pid) {
      return NextResponse.json({ error: "projectId required for admin" }, { status: 400 });
    }
    projectId = pid;
  } else {
    const auth = authenticate(req);
    if (!auth.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    projectId = auth.projectId;
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset = Number(searchParams.get("offset") ?? 0);
  const source = searchParams.get("source");

  let query = "SELECT * FROM leads WHERE project_id = ?";
  const params: (string | number)[] = [projectId];

  if (source) {
    query += " AND source = ?";
    params.push(source);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const leads = db.prepare(query).all(...params);
  const total = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE project_id = ?"
  ).get(projectId) as { count: number };

  return NextResponse.json({ leads, total: total.count, limit, offset });
}
