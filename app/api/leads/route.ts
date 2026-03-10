import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import getDb from "@/lib/db";
import { authenticate } from "@/lib/auth";

// POST /api/leads — record a new lead
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
      INSERT INTO leads (id, client_id, source, name, email, phone, type, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      auth.clientId!,
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

// GET /api/leads — list recent leads
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!auth.valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset = Number(searchParams.get("offset") ?? 0);
  const source = searchParams.get("source");

  const db = getDb();

  let query = "SELECT * FROM leads WHERE client_id = ?";
  const params: (string | number)[] = [auth.clientId!];

  if (source) {
    query += " AND source = ?";
    params.push(source);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const leads = db.prepare(query).all(...params);
  const total = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE client_id = ?"
  ).get(auth.clientId!) as { count: number };

  return NextResponse.json({ leads, total: total.count, limit, offset });
}
