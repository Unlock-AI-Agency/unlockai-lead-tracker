import Database from "better-sqlite3";
import path from "path";
import { hashKey } from "./crypto";

const DB_PATH = path.join(process.cwd(), "data", "leads.db");

let db: Database.Database;

function getDb() {
  if (!db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");

    // Projects
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // API keys (stored as SHA-256 hashes)
    db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT 'default',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        revoked_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id);
    `);

    // Leads
    db.exec(`
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
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_leads_project ON leads(project_id);
      CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
      CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
    `);

    // Auto-migrate: seed from env vars if projects table is empty
    const count = db.prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number };
    if (count.c === 0) {
      const oldKey = process.env.API_KEY;
      const oldClientId = process.env.CLIENT_ID ?? "default";

      if (oldKey) {
        const { v4: uuid } = require("uuid");
        const projectId = uuid();

        db.prepare(
          "INSERT INTO projects (id, slug, name) VALUES (?, ?, ?)"
        ).run(projectId, oldClientId, oldClientId);

        db.prepare(
          "INSERT INTO api_keys (id, project_id, key_hash, key_prefix, label) VALUES (?, ?, ?, ?, ?)"
        ).run(uuid(), projectId, hashKey(oldKey), oldKey.slice(0, 12) + "...", "migrated");

        // Backfill existing leads
        db.prepare(
          "UPDATE leads SET project_id = ? WHERE project_id IS NULL"
        ).run(projectId);
      }
    }
  }
  return db;
}

export default getDb;
