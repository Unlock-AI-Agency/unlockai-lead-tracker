import { NextRequest, NextResponse } from "next/server";
import getDb, { initDb } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!(await authenticateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  await initDb();
  const sql = getDb();

  const projects = await sql`SELECT * FROM projects WHERE id = ${projectId}`;
  if (projects.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM leads WHERE project_id = ${projectId}`;

  return NextResponse.json({ ...projects[0], lead_count: count });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await authenticateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  await initDb();
  const sql = getDb();
  await sql`UPDATE projects SET name = ${name} WHERE id = ${projectId}`;

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await authenticateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  await initDb();
  const sql = getDb();

  await sql`DELETE FROM leads WHERE project_id = ${projectId}`;
  await sql`DELETE FROM api_keys WHERE project_id = ${projectId}`;
  await sql`DELETE FROM notification_config WHERE project_id = ${projectId}`;
  await sql`DELETE FROM projects WHERE id = ${projectId}`;

  return NextResponse.json({ success: true });
}
