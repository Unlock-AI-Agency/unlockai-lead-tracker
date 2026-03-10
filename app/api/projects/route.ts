import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import getDb from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth";

// GET /api/projects — list all projects
export async function GET(req: NextRequest) {
  if (!authenticateAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const projects = db.prepare(`
    SELECT
      p.*,
      (SELECT COUNT(*) FROM leads WHERE project_id = p.id) as lead_count,
      (SELECT COUNT(*) FROM api_keys WHERE project_id = p.id AND revoked_at IS NULL) as active_keys
    FROM projects p
    ORDER BY p.created_at DESC
  `).all();

  return NextResponse.json({ projects });
}

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  if (!authenticateAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug, name } = await req.json();

    if (!slug || !name) {
      return NextResponse.json({ error: "slug and name are required" }, { status: 400 });
    }

    // Sanitize slug
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const id = uuid();
    const db = getDb();

    db.prepare(
      "INSERT INTO projects (id, slug, name) VALUES (?, ?, ?)"
    ).run(id, cleanSlug, name);

    return NextResponse.json({ id, slug: cleanSlug, name }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UNIQUE")) {
      return NextResponse.json({ error: "A project with that slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
