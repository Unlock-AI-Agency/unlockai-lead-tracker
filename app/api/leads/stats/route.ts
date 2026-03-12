import { NextRequest, NextResponse } from "next/server";
import getDb, { initDb } from "@/lib/db";
import { authenticate, authenticateAdmin } from "@/lib/auth";

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

  const [{ count: total }] = await sql`SELECT COUNT(*)::int as count FROM leads WHERE project_id = ${projectId}`;
  const [{ count: today }] = await sql`SELECT COUNT(*)::int as count FROM leads WHERE project_id = ${projectId} AND created_at::date = CURRENT_DATE`;
  const [{ count: thisWeek }] = await sql`SELECT COUNT(*)::int as count FROM leads WHERE project_id = ${projectId} AND created_at >= now() - interval '7 days'`;
  const [{ count: thisMonth }] = await sql`SELECT COUNT(*)::int as count FROM leads WHERE project_id = ${projectId} AND created_at >= now() - interval '30 days'`;

  const bySource = await sql`SELECT source, COUNT(*)::int as count FROM leads WHERE project_id = ${projectId} GROUP BY source ORDER BY count DESC`;
  const byType = await sql`SELECT type, COUNT(*)::int as count FROM leads WHERE project_id = ${projectId} AND type IS NOT NULL GROUP BY type ORDER BY count DESC`;
  const daily = await sql`SELECT created_at::date as date, COUNT(*)::int as count FROM leads WHERE project_id = ${projectId} AND created_at >= now() - interval '30 days' GROUP BY created_at::date ORDER BY date DESC`;

  return NextResponse.json({ total, today, thisWeek, thisMonth, bySource, byType, daily });
}
