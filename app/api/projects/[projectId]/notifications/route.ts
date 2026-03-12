import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth";

type Params = { params: Promise<{ projectId: string }> };

// GET /api/projects/:id/notifications — get notification config
export async function GET(req: NextRequest, { params }: Params) {
  if (!authenticateAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const db = getDb();

  const config = db
    .prepare("SELECT * FROM notification_config WHERE project_id = ?")
    .get(projectId) as Record<string, unknown> | undefined;

  if (!config) {
    return NextResponse.json({ configured: false });
  }

  // Never return the full API key — just show a masked version
  const maskedKey = config.mailgun_api_key
    ? String(config.mailgun_api_key).slice(0, 8) + "..." + String(config.mailgun_api_key).slice(-4)
    : "";

  return NextResponse.json({
    configured: true,
    enabled: config.enabled === 1,
    to_email: config.to_email,
    from_name: config.from_name,
    mailgun_domain: config.mailgun_domain,
    mailgun_base_url: config.mailgun_base_url,
    mailgun_api_key_masked: maskedKey,
  });
}

// PUT /api/projects/:id/notifications — create or update notification config
export async function PUT(req: NextRequest, { params }: Params) {
  if (!authenticateAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await req.json();
  const {
    enabled = true,
    to_email,
    from_name = "Lead Tracker",
    mailgun_api_key,
    mailgun_domain,
    mailgun_base_url = "https://api.mailgun.net",
  } = body;

  if (!to_email || !mailgun_domain) {
    return NextResponse.json(
      { error: "to_email and mailgun_domain are required" },
      { status: 400 }
    );
  }

  const db = getDb();

  // If updating an existing config and no new API key provided, keep the old one
  const existing = db.prepare("SELECT mailgun_api_key FROM notification_config WHERE project_id = ?").get(projectId) as { mailgun_api_key: string } | undefined;
  const finalApiKey = mailgun_api_key || existing?.mailgun_api_key;

  if (!finalApiKey) {
    return NextResponse.json(
      { error: "mailgun_api_key is required" },
      { status: 400 }
    );
  }

  db.prepare(`
    INSERT INTO notification_config (project_id, enabled, to_email, from_name, mailgun_api_key, mailgun_domain, mailgun_base_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(project_id) DO UPDATE SET
      enabled = excluded.enabled,
      to_email = excluded.to_email,
      from_name = excluded.from_name,
      mailgun_api_key = excluded.mailgun_api_key,
      mailgun_domain = excluded.mailgun_domain,
      mailgun_base_url = excluded.mailgun_base_url,
      updated_at = datetime('now')
  `).run(
    projectId,
    enabled ? 1 : 0,
    to_email,
    from_name,
    finalApiKey,
    mailgun_domain,
    mailgun_base_url
  );

  return NextResponse.json({ success: true });
}

// DELETE /api/projects/:id/notifications — remove notification config
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!authenticateAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const db = getDb();

  db.prepare("DELETE FROM notification_config WHERE project_id = ?").run(projectId);

  return NextResponse.json({ success: true });
}
