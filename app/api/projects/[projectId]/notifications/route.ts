import { NextRequest, NextResponse } from "next/server";
import getDb, { initDb } from "@/lib/db";
import { authenticateAdmin } from "@/lib/auth";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!(await authenticateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  await initDb();
  const sql = getDb();

  const rows = await sql`SELECT * FROM notification_config WHERE project_id = ${projectId}`;

  if (rows.length === 0) {
    return NextResponse.json({ configured: false });
  }

  const config = rows[0];
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

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await authenticateAdmin(req))) {
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
    return NextResponse.json({ error: "to_email and mailgun_domain are required" }, { status: 400 });
  }

  await initDb();
  const sql = getDb();

  const existing = await sql`SELECT mailgun_api_key FROM notification_config WHERE project_id = ${projectId}`;
  const finalApiKey = mailgun_api_key || existing[0]?.mailgun_api_key;

  if (!finalApiKey) {
    return NextResponse.json({ error: "mailgun_api_key is required" }, { status: 400 });
  }

  const enabledInt = enabled ? 1 : 0;

  await sql`
    INSERT INTO notification_config (project_id, enabled, to_email, from_name, mailgun_api_key, mailgun_domain, mailgun_base_url, updated_at)
    VALUES (${projectId}, ${enabledInt}, ${to_email}, ${from_name}, ${finalApiKey}, ${mailgun_domain}, ${mailgun_base_url}, now())
    ON CONFLICT(project_id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      to_email = EXCLUDED.to_email,
      from_name = EXCLUDED.from_name,
      mailgun_api_key = EXCLUDED.mailgun_api_key,
      mailgun_domain = EXCLUDED.mailgun_domain,
      mailgun_base_url = EXCLUDED.mailgun_base_url,
      updated_at = now()
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await authenticateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  await initDb();
  const sql = getDb();

  await sql`DELETE FROM notification_config WHERE project_id = ${projectId}`;

  return NextResponse.json({ success: true });
}
