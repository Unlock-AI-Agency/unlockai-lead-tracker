import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { authenticate } from "@/lib/auth";

// GET /api/leads/stats — lead counts and breakdowns
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!auth.valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const clientId = auth.clientId!;

  const total = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE client_id = ?"
  ).get(clientId) as { count: number };

  const today = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE client_id = ? AND date(created_at) = date('now')"
  ).get(clientId) as { count: number };

  const thisWeek = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE client_id = ? AND created_at >= datetime('now', '-7 days')"
  ).get(clientId) as { count: number };

  const thisMonth = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE client_id = ? AND created_at >= datetime('now', '-30 days')"
  ).get(clientId) as { count: number };

  const bySource = db.prepare(
    "SELECT source, COUNT(*) as count FROM leads WHERE client_id = ? GROUP BY source ORDER BY count DESC"
  ).all(clientId);

  const byType = db.prepare(
    "SELECT type, COUNT(*) as count FROM leads WHERE client_id = ? AND type IS NOT NULL GROUP BY type ORDER BY count DESC"
  ).all(clientId);

  const daily = db.prepare(
    "SELECT date(created_at) as date, COUNT(*) as count FROM leads WHERE client_id = ? AND created_at >= datetime('now', '-30 days') GROUP BY date(created_at) ORDER BY date DESC"
  ).all(clientId);

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
