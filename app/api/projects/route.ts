import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import getDb, { initDb } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await authenticateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDb();
  const sql = getDb();
  const projects = await sql`
    SELECT
      p.*,
      (SELECT COUNT(*)::int FROM leads WHERE project_id = p.id) as lead_count,
      (SELECT COUNT(*)::int FROM api_keys WHERE project_id = p.id AND revoked_at IS NULL) as active_keys
    FROM projects p
    ORDER BY p.created_at DESC
  `;

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  if (!(await authenticateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug, name } = await req.json();
    if (!slug || !name) {
      return NextResponse.json({ error: "slug and name are required" }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const id = uuid();
    await initDb();
    const sql = getDb();

    await sql`INSERT INTO projects (id, slug, name) VALUES (${id}, ${cleanSlug}, ${name})`;

    return NextResponse.json({ id, slug: cleanSlug, name }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "A project with that slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
