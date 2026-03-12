import { NextRequest, NextResponse } from "next/server";
import getDb, { initDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  await initDb();
  const sql = getDb();
  const rows = await sql`SELECT id FROM users WHERE verify_token = ${token} AND verified = 0`;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await sql`UPDATE users SET verified = 1, verify_token = NULL WHERE id = ${rows[0].id}`;

  const baseUrl = req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
    : new URL(req.url).origin;

  return NextResponse.redirect(`${baseUrl}/login?verified=1`);
}
