import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth";

type Params = { params: Promise<{ projectId: string }> };

// GET /api/projects/:id
export async function GET(req: NextRequest, { params }: Params) {
  if (!authenticateAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const db = getDb();

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const leadCount = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE project_id = ?"
  ).get(projectId) as { count: number };

  return NextResponse.json({ ...project, lead_count: leadCount.count });
}

// PATCH /api/projects/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  if (!authenticateAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const { name } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("UPDATE projects SET name = ? WHERE id = ?").run(name, projectId);

  return NextResponse.json({ success: true });
}

// DELETE /api/projects/:id
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!authenticateAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const db = getDb();

  db.prepare("DELETE FROM leads WHERE project_id = ?").run(projectId);
  db.prepare("DELETE FROM api_keys WHERE project_id = ?").run(projectId);
  db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);

  return NextResponse.json({ success: true });
}
