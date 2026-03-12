import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { hashKey } from "./crypto";

export type SQL = NeonQueryFunction<false, false>;

let initialized = false;

function getSql(): SQL {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is required");
  return neon(url);
}

export async function initDb(): Promise<void> {
  if (initialized) return;
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT 'default',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      revoked_at TIMESTAMPTZ
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      client_id TEXT,
      source TEXT NOT NULL DEFAULT 'quote_form',
      name TEXT,
      email TEXT,
      phone TEXT,
      type TEXT,
      metadata TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_project ON leads(project_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source)`;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      verify_token TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_verify ON users(verify_token)`;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS notification_config (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      enabled INTEGER NOT NULL DEFAULT 1,
      to_email TEXT NOT NULL,
      from_name TEXT NOT NULL DEFAULT 'Lead Tracker',
      mailgun_api_key TEXT NOT NULL,
      mailgun_domain TEXT NOT NULL,
      mailgun_base_url TEXT NOT NULL DEFAULT 'https://api.mailgun.net',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;

  // Auto-seed from env vars if projects table is empty
  const [{ c }] = await sql`SELECT COUNT(*)::int as c FROM projects`;
  if (c === 0) {
    const oldKey = process.env.API_KEY;
    const oldClientId = process.env.CLIENT_ID ?? "default";

    if (oldKey) {
      const { v4: uuid } = require("uuid");
      const projectId = uuid();
      await sql`INSERT INTO projects (id, slug, name) VALUES (${projectId}, ${oldClientId}, ${oldClientId})`;
      await sql`INSERT INTO api_keys (id, project_id, key_hash, key_prefix, label) VALUES (${uuid()}, ${projectId}, ${hashKey(oldKey)}, ${oldKey.slice(0, 12) + "..."}, 'migrated')`;
      await sql`UPDATE leads SET project_id = ${projectId} WHERE project_id IS NULL`;
    }
  }

  initialized = true;
}

export default function getDb(): SQL {
  return getSql();
}
