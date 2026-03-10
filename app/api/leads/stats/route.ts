import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { authenticate, authenticateAdmin } from "@/lib/auth";

// GET /api/leads/stats — lead counts and breakdowns
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const db = getDb();

  let projectId: string;

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

  const total = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE project_id = ?"
  ).get(projectId) as { count: number };

  const today = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE project_id = ? AND date(created_at) = date('now')"
  ).get(projectId) as { count: number };

  const thisWeek = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE project_id = ? AND created_at >= datetime('now', '-7 days')"
  ).get(projectId) as { count: number };

  const thisMonth = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE project_id = ? AND created_at >= datetime('now', '-30 days')"
  ).get(projectId) as { count: number };

  const bySource = db.prepare(
    "SELECT source, COUNT(*) as count FROM leads WHERE project_id = ? GROUP BY source ORDER BY count DESC"
  ).all(projectId);

  const byType = db.prepare(
    "SELECT type, COUNT(*) as count FROM leads WHERE project_id = ? AND type IS NOT NULL GROUP BY type ORDER BY count DESC"
  ).all(projectId);

  const daily = db.prepare(
    "SELECT date(created_at) as date, COUNT(*) as count FROM leads WHERE project_id = ? AND created_at >= datetime('now', '-30 days') GROUP BY date(created_at) ORDER BY date DESC"
  ).all(projectId);

  return NextResponse.json({
    total: total.count,
    today: today.count,
    thisWeek: thisWeek.count,
    thisMonth: thisMonth.count,
    bySource,
    byType,
    daily,
  });
}
