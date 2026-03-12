import { NextRequest, NextResponse } from "next/server";
import getDb, { initDb } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    await initDb();
    const sql = getDb();
    const rows = await sql`SELECT id, name, email, password_hash, verified FROM users WHERE email = ${email.toLowerCase()}`;

    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!user.verified) {
      return NextResponse.json(
        { error: "Please verify your email before logging in. Check your inbox." },
        { status: 403 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err: unknown) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
