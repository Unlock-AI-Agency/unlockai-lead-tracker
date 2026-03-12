import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import getDb, { initDb } from "@/lib/db";
import { authenticate, authenticateAdmin } from "@/lib/auth";
import { notifyLead } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { source = "quote_form", name, email, phone, type, metadata } = body;

    const id = uuid();
    await initDb();
    const sql = getDb();

    await sql`
      INSERT INTO leads (id, project_id, client_id, source, name, email, phone, type, metadata)
      VALUES (${id}, ${auth.projectId}, ${auth.projectSlug}, ${source}, ${name ?? null}, ${email ?? null}, ${phone ?? null}, ${type ?? null}, ${metadata ? JSON.stringify(metadata) : null})
    `;

    const projects = await sql`SELECT name FROM projects WHERE id = ${auth.projectId}`;

    notifyLead(auth.projectId, projects[0]?.name ?? auth.projectSlug, {
      source, name, email, phone, type, metadata,
    }).catch(() => {});

    return NextResponse.json({ id, status: "recorded" }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  let projectId: string;

  if (await authenticateAdmin(req)) {
    const pid = searchParams.get("projectId");
    if (!pid) {
      return NextResponse.json({ error: "projectId required for admin" }, { status: 400 });
    }
    projectId = pid;
  } else {
    const auth = await authenticate(req);
    if (!auth.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    projectId = auth.projectId;
  }

  await initDb();
  const sql = getDb();
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset = Number(searchParams.get("offset") ?? 0);
  const source = searchParams.get("source");

  let leads;
  if (source) {
    leads = await sql`SELECT * FROM leads WHERE project_id = ${projectId} AND source = ${source} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  } else {
    leads = await sql`SELECT * FROM leads WHERE project_id = ${projectId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  }

  const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM leads WHERE project_id = ${projectId}`;

  return NextResponse.json({ leads, total: count, limit, offset });
}
