import { cookies } from "next/headers";
import getDb, { initDb } from "./db";
import { generateSessionId } from "./crypto";

const SESSION_COOKIE = "lt_session";
const SESSION_DAYS = 30;

type User = {
  id: string;
  email: string;
  name: string;
};

export async function createSession(userId: string): Promise<string> {
  await initDb();
  const sql = getDb();
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (${id}, ${userId}, ${expiresAt})`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return id;
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  await initDb();
  const sql = getDb();
  const rows = await sql`
    SELECT u.id, u.email, u.name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sessionId} AND s.expires_at > now() AND u.verified = 1
  `;

  if (rows.length === 0) {
    await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
    return null;
  }

  return rows[0] as User;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await initDb();
    const sql = getDb();
    await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
    cookieStore.delete(SESSION_COOKIE);
  }
}
