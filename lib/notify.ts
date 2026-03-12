import Mailgun from "mailgun.js";
import FormData from "form-data";
import getDb from "./db";

type NotificationConfig = {
  project_id: string;
  enabled: number;
  to_email: string;
  from_name: string;
  mailgun_api_key: string;
  mailgun_domain: string;
  mailgun_base_url: string;
};

type LeadData = {
  source: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  type?: string | null;
  metadata?: Record<string, unknown> | null;
};

function getConfig(projectId: string): NotificationConfig | null {
  const db = getDb();
  return db
    .prepare("SELECT * FROM notification_config WHERE project_id = ? AND enabled = 1")
    .get(projectId) as NotificationConfig | null;
}

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    quote_form: "Quote Form",
    chatbot: "AI Chatbot",
    phone_click: "Phone Click",
    contact_form: "Contact Form",
  };
  return labels[source] || source;
}

function sourceBadgeColor(source: string): { bg: string; text: string } {
  const colors: Record<string, { bg: string; text: string }> = {
    quote_form: { bg: "#e8f4f7", text: "#3d7a8a" },
    chatbot: { bg: "#f0e6ff", text: "#6b21a8" },
    phone_click: { bg: "#fef3c7", text: "#92400e" },
    contact_form: { bg: "#dcfce7", text: "#166534" },
  };
  return colors[source] || { bg: "#f3f4f6", text: "#374151" };
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<tr>
    <td style="padding:14px 16px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#333;width:130px;vertical-align:top;font-size:14px">${label}</td>
    <td style="padding:14px 16px;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px">${value}</td>
  </tr>`;
}

function linkCell(type: "email" | "phone", value: string): string {
  if (type === "email") {
    return `<a href="mailto:${value}" style="color:#3d7a8a;text-decoration:none">${value}</a>`;
  }
  const digits = value.replace(/\D/g, "");
  return `<a href="tel:${digits}" style="color:#3d7a8a;text-decoration:none">${value}</a>`;
}

function buildMetadataRows(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return "";
  const fieldLabels: Record<string, string> = {
    address: "Address",
    roofAge: "Roof Age",
    yearBuilt: "Year Built",
    squareFt: "Square Footage",
    drivers: "Drivers",
    vins: "Vehicles / VINs",
    currentCoverage: "Current Coverage",
    riderExperience: "Rider Experience",
    rvType: "RV Type",
    fullTimeUse: "Full-Time Use",
    boatType: "Boat Type",
    boatLength: "Boat Length",
    boatValue: "Boat Value",
    waterType: "Water Type",
    existingPolicies: "Existing Policies",
    desiredCoverage: "Desired Coverage",
    businessType: "Business Type",
    employees: "Employees",
    annualRevenue: "Annual Revenue",
    personalPropertyValue: "Personal Property Value",
    floodZone: "Flood Zone",
    message: "Message",
  };

  return Object.entries(metadata)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => row(fieldLabels[k] || k, String(v)))
    .join("");
}

function buildHtml(lead: LeadData, projectName: string): string {
  const badge = sourceBadgeColor(lead.source);
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "long",
    timeStyle: "short",
  });

  const metadataRows = buildMetadataRows(
    lead.metadata as Record<string, unknown> | null
  );

  return `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
  <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 28px;border-radius:8px 8px 0 0">
    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;letter-spacing:-0.3px">New Lead Captured</h1>
    <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:14px">${projectName}</p>
  </div>
  <div style="padding:28px;border:1px solid #e8e8e8;border-top:none;border-radius:0 0 8px 8px">
    <table style="width:100%;border-collapse:collapse">
      ${row("Name", lead.name || "Not provided")}
      ${row("Email", lead.email ? linkCell("email", lead.email) : "Not provided")}
      ${row("Phone", lead.phone ? linkCell("phone", lead.phone) : "Not provided")}
      ${lead.type ? row("Type", `<strong>${lead.type}</strong>`) : ""}
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#333;width:130px;vertical-align:top;font-size:14px">Source</td>
        <td style="padding:14px 16px;border-bottom:1px solid #f0f0f0;font-size:14px">
          <span style="background:${badge.bg};color:${badge.text};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600">${sourceLabel(lead.source)}</span>
        </td>
      </tr>
      ${metadataRows}
    </table>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f0f0f0">
      <p style="color:#999;font-size:12px;margin:0">Captured on ${timestamp}</p>
    </div>
  </div>
</div>`;
}

function buildText(lead: LeadData, projectName: string): string {
  const lines = [
    `New lead captured — ${projectName}`,
    ``,
    `Name: ${lead.name || "Not provided"}`,
    `Email: ${lead.email || "Not provided"}`,
    `Phone: ${lead.phone || "Not provided"}`,
  ];
  if (lead.type) lines.push(`Type: ${lead.type}`);
  lines.push(`Source: ${sourceLabel(lead.source)}`);

  if (lead.metadata) {
    for (const [k, v] of Object.entries(lead.metadata)) {
      if (v != null && v !== "") lines.push(`${k}: ${v}`);
    }
  }

  lines.push(
    ``,
    `Captured at: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })}`
  );
  return lines.join("\n");
}

export async function notifyLead(
  projectId: string,
  projectName: string,
  lead: LeadData
): Promise<void> {
  const config = getConfig(projectId);
  if (!config) return;

  try {
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: "api",
      key: config.mailgun_api_key,
      url: config.mailgun_base_url,
    });

    const fromEmail = `${config.from_name} <noreply@${config.mailgun_domain}>`;
    const subject = lead.type
      ? `${lead.type} Lead — ${lead.name || "New Lead"} — ${sourceLabel(lead.source)}`
      : `New Lead — ${lead.name || "Unknown"} — ${sourceLabel(lead.source)}`;

    await mg.messages.create(config.mailgun_domain, {
      to: config.to_email.split(",").map((e) => e.trim()),
      from: fromEmail,
      ...(lead.email ? { "h:Reply-To": lead.email } : {}),
      subject,
      html: buildHtml(lead, projectName),
      text: buildText(lead, projectName),
    });
  } catch (err) {
    console.error(`[notify] Failed to send email for project ${projectId}:`, err);
  }
}
