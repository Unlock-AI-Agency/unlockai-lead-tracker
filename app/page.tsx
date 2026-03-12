"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ──

type Project = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
  lead_count: number;
  active_keys: number;
};

type ApiKey = {
  id: string;
  key_prefix: string;
  label: string;
  created_at: string;
  revoked_at: string | null;
};

type Stats = {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  bySource: { source: string; count: number }[];
  byType: { type: string; count: number }[];
  daily: { date: string; count: number }[];
};

type Lead = {
  id: string;
  source: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  type: string | null;
  metadata: string | null;
  created_at: string;
};

type NotificationConfig = {
  configured: boolean;
  enabled?: boolean;
  to_email?: string;
  from_name?: string;
  mailgun_domain?: string;
  mailgun_base_url?: string;
  mailgun_api_key_masked?: string;
};

// ── Helpers ──

function adminHeaders(secret: string) {
  return { "Content-Type": "application/json", "x-admin-secret": secret };
}

const SOURCE_COLORS: Record<string, string> = {
  quote_form: "bg-blue-50 text-blue-700",
  chatbot: "bg-purple-50 text-purple-700",
  phone_click: "bg-amber-50 text-amber-700",
  contact_form: "bg-green-50 text-green-700",
};

const SOURCE_LABELS: Record<string, string> = {
  quote_form: "Quote Form",
  chatbot: "Chatbot",
  phone_click: "Phone Click",
  contact_form: "Contact Form",
};

function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] || "bg-gray-100 text-gray-700";
  const label = SOURCE_LABELS[source] || source;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// ── Components ──

function AuthGate({ onAuth }: { onAuth: (secret: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      headers: { "x-admin-secret": value },
    });
    if (res.ok) {
      localStorage.setItem("admin-secret", value);
      onAuth(value);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">UnlockAI Lead Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">Enter your admin secret to continue.</p>
        <input
          type="password"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(false); }}
          placeholder="Admin secret"
          className="mt-4 w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
        {error && <p className="mt-2 text-sm text-red-500">Invalid secret</p>}
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}

function NewProjectForm({
  secret,
  onCreated,
}: {
  secret: string;
  onCreated: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/projects", {
      method: "POST",
      headers: adminHeaders(secret),
      body: JSON.stringify({ slug, name }),
    });
    setSlug("");
    setName("");
    setOpen(false);
    onCreated();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
      >
        + New Project
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-4 shadow-sm">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        required
      />
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
        placeholder="project-slug"
        className="mt-2 w-full rounded border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-200"
        required
      />
      <div className="mt-3 flex gap-2">
        <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
          Create
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

function ApiKeysPanel({ secret, projectId }: { secret: string; projectId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [label, setLabel] = useState("production");
  const [showForm, setShowForm] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/keys`, {
      headers: adminHeaders(secret),
    });
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys);
    }
  }, [secret, projectId]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const generateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/keys`, {
      method: "POST",
      headers: adminHeaders(secret),
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKey(data.key);
      setShowForm(false);
      setLabel("production");
      fetchKeys();
    }
  };

  const revokeKey = async (keyId: string) => {
    await fetch(`/api/projects/${projectId}/keys/${keyId}`, {
      method: "PATCH",
      headers: adminHeaders(secret),
    });
    fetchKeys();
  };

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">API Keys</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            Generate
          </button>
        )}
      </div>

      {newKey && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-medium text-green-800">
            Copy this key now — you won&apos;t see it again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-3 py-2 text-xs font-mono text-green-900 border">
              {newKey}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(newKey); }}
              className="shrink-0 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 text-xs text-green-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={generateKey} className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="production, staging, etc."
            />
          </div>
          <button type="submit" className="rounded bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800">
            Generate
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="rounded border px-3 py-2 text-xs text-gray-500 hover:bg-gray-50">
            Cancel
          </button>
        </form>
      )}

      <div className="mt-4 divide-y">
        {keys.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400">No API keys yet</p>
        )}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between py-3">
            <div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-600">{k.key_prefix}</code>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  {k.label}
                </span>
                {k.revoked_at && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                    revoked
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-gray-400">
                Created {new Date(k.created_at).toLocaleDateString()}
              </p>
            </div>
            {!k.revoked_at && (
              <button
                onClick={() => revokeKey(k.id)}
                className="rounded border border-red-200 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsPanel({ secret, projectId }: { secret: string; projectId: string }) {
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: true,
    to_email: "",
    from_name: "Lead Tracker",
    mailgun_api_key: "",
    mailgun_domain: "",
    mailgun_base_url: "https://api.mailgun.net",
  });

  const fetchConfig = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/notifications`, {
      headers: adminHeaders(secret),
    });
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      if (data.configured) {
        setForm({
          enabled: data.enabled,
          to_email: data.to_email || "",
          from_name: data.from_name || "Lead Tracker",
          mailgun_api_key: "",
          mailgun_domain: data.mailgun_domain || "",
          mailgun_base_url: data.mailgun_base_url || "https://api.mailgun.net",
        });
      }
    }
  }, [secret, projectId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: Record<string, unknown> = { ...form };
    // If editing existing and no new key entered, don't overwrite
    if (config?.configured && !form.mailgun_api_key) {
      delete payload.mailgun_api_key;
    }

    await fetch(`/api/projects/${projectId}/notifications`, {
      method: "PUT",
      headers: adminHeaders(secret),
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setEditing(false);
    fetchConfig();
  };

  const handleDelete = async () => {
    await fetch(`/api/projects/${projectId}/notifications`, {
      method: "DELETE",
      headers: adminHeaders(secret),
    });
    setConfig({ configured: false });
    setForm({
      enabled: true,
      to_email: "",
      from_name: "Lead Tracker",
      mailgun_api_key: "",
      mailgun_domain: "",
      mailgun_base_url: "https://api.mailgun.net",
    });
    setEditing(false);
  };

  if (!config) return null;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Email Notifications</h3>
        {config.configured && !editing && (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${config.enabled ? "bg-green-500" : "bg-gray-300"}`} />
            <span className="text-xs text-gray-500">{config.enabled ? "Active" : "Disabled"}</span>
          </div>
        )}
      </div>

      {!config.configured && !editing ? (
        <div className="mt-4">
          <p className="text-sm text-gray-400">No email notifications configured.</p>
          <button
            onClick={() => setEditing(true)}
            className="mt-3 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            Configure
          </button>
        </div>
      ) : !editing ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">To</span>
            <span className="font-medium text-gray-900">{config.to_email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">From Name</span>
            <span className="text-gray-700">{config.from_name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Domain</span>
            <code className="text-xs text-gray-600">{config.mailgun_domain}</code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">API Key</span>
            <code className="text-xs text-gray-600">{config.mailgun_api_key_masked}</code>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="rounded border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="rounded"
            />
            <span className="text-gray-700">Enabled</span>
          </label>
          <div>
            <label className="text-xs text-gray-500">Send To (comma-separated)</label>
            <input
              value={form.to_email}
              onChange={(e) => setForm({ ...form, to_email: e.target.value })}
              className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="leads@example.com"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">From Name</label>
            <input
              value={form.from_name}
              onChange={(e) => setForm({ ...form, from_name: e.target.value })}
              className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Sparks Insurance"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Mailgun API Key</label>
            <input
              value={form.mailgun_api_key}
              onChange={(e) => setForm({ ...form, mailgun_api_key: e.target.value })}
              className="mt-1 w-full rounded border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={config?.configured ? "Leave blank to keep current" : "key-xxxxx"}
              required={!config?.configured}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Mailgun Domain</label>
            <input
              value={form.mailgun_domain}
              onChange={(e) => setForm({ ...form, mailgun_domain: e.target.value })}
              className="mt-1 w-full rounded border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="mg.example.com"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Mailgun Base URL</label>
            <input
              value={form.mailgun_base_url}
              onChange={(e) => setForm({ ...form, mailgun_base_url: e.target.value })}
              className="mt-1 w-full rounded border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Main Dashboard ──

export default function Dashboard() {
  const [secret, setSecret] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [sourceFilter, setSourceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // Tab
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "settings">("overview");

  // Check for saved secret
  useEffect(() => {
    const saved = localStorage.getItem("admin-secret");
    if (saved) setSecret(saved);
    else setLoading(false);
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!secret) return;
    const res = await fetch("/api/projects", { headers: adminHeaders(secret) });
    if (res.ok) {
      const data = await res.json();
      setProjects(data.projects);
      if (!selectedId && data.projects.length > 0) {
        setSelectedId(data.projects[0].id);
      }
    } else {
      localStorage.removeItem("admin-secret");
      setSecret(null);
    }
    setLoading(false);
  }, [secret, selectedId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Fetch stats when project changes
  useEffect(() => {
    if (!secret || !selectedId) return;
    const h = adminHeaders(secret);

    fetch(`/api/leads/stats?projectId=${selectedId}`, { headers: h })
      .then((r) => r.ok ? r.json() : null)
      .then((s) => setStats(s));
  }, [secret, selectedId]);

  // Fetch leads with filters
  const fetchLeads = useCallback(async () => {
    if (!secret || !selectedId) return;
    const h = adminHeaders(secret);
    const params = new URLSearchParams({
      projectId: selectedId,
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (sourceFilter) params.set("source", sourceFilter);

    const res = await fetch(`/api/leads?${params}`, { headers: h });
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads ?? []);
      setTotalLeads(data.total ?? 0);
    }
  }, [secret, selectedId, sourceFilter, page]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Reset filters when project changes
  useEffect(() => {
    setSourceFilter("");
    setTypeFilter("");
    setPage(0);
    setActiveTab("overview");
  }, [selectedId]);

  const exportCSV = () => {
    if (!leads.length) return;
    const headers = ["Name", "Email", "Phone", "Type", "Source", "Date"];
    const rows = leads.map((l) => [
      l.name || "",
      l.email || "",
      l.phone || "",
      l.type || "",
      l.source,
      new Date(l.created_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLeads = typeFilter
    ? leads.filter((l) => l.type === typeFilter)
    : leads;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!secret) {
    return <AuthGate onAuth={setSecret} />;
  }

  const selectedProject = projects.find((p) => p.id === selectedId);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-white p-5">
        <h1 className="text-lg font-bold text-gray-900">UnlockAI</h1>
        <p className="text-xs text-gray-500">Lead Tracker</p>

        <div className="mt-6 space-y-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Projects
          </p>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                p.id === selectedId
                  ? "bg-gray-900 font-medium text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="block truncate">{p.name}</span>
              <span className={`text-[10px] ${p.id === selectedId ? "text-gray-300" : "text-gray-400"}`}>
                {p.lead_count} leads &middot; {p.active_keys} keys
              </span>
            </button>
          ))}
          <div className="pt-2">
            <NewProjectForm secret={secret} onCreated={fetchProjects} />
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("admin-secret");
            setSecret(null);
          }}
          className="mt-8 text-xs text-gray-400 hover:text-gray-600"
        >
          Sign out
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6 md:p-10">
        {!selectedProject ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            Create a project to get started
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedProject.name}
                </h2>
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-500">
                  {selectedProject.slug}
                </code>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-1 border-b">
              {(["overview", "leads", "settings"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <>
                {/* Stat Cards */}
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: "Total Leads", value: stats?.total ?? 0, color: "text-gray-900" },
                    { label: "Today", value: stats?.today ?? 0, color: "text-blue-600" },
                    { label: "This Week", value: stats?.thisWeek ?? 0, color: "text-purple-600" },
                    { label: "This Month", value: stats?.thisMonth ?? 0, color: "text-green-600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl border bg-white p-5 shadow-sm">
                      <p className="text-sm text-gray-500">{label}</p>
                      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Breakdowns */}
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900">By Source</h3>
                    {stats?.bySource?.length ? (
                      <div className="mt-3 space-y-2">
                        {stats.bySource.map(({ source, count }) => {
                          const total = stats.total || 1;
                          const pct = Math.round((count / total) * 100);
                          return (
                            <div key={source}>
                              <div className="flex items-center justify-between mb-1">
                                <SourceBadge source={source} />
                                <span className="text-sm font-semibold text-gray-900">{count}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-gray-100">
                                <div
                                  className="h-1.5 rounded-full bg-blue-500 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-gray-400">No data yet</p>
                    )}
                  </div>

                  <div className="rounded-xl border bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900">By Type</h3>
                    {stats?.byType?.length ? (
                      <div className="mt-3 space-y-2">
                        {stats.byType.map(({ type, count }) => {
                          const total = stats.total || 1;
                          const pct = Math.round((count / total) * 100);
                          return (
                            <div key={type}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                  {type}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">{count}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-gray-100">
                                <div
                                  className="h-1.5 rounded-full bg-green-500 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-gray-400">No data yet</p>
                    )}
                  </div>
                </div>

                {/* Recent leads preview */}
                <div className="mt-6 rounded-xl border bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-900">Recent Leads</h3>
                    <button
                      onClick={() => setActiveTab("leads")}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      View All
                    </button>
                  </div>
                  {leads.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Contact</th>
                            <th className="px-5 py-3">Type</th>
                            <th className="px-5 py-3">Source</th>
                            <th className="px-5 py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {leads.slice(0, 10).map((lead) => (
                            <tr key={lead.id} className="hover:bg-gray-50">
                              <td className="px-5 py-3 font-medium text-gray-900">{lead.name ?? "—"}</td>
                              <td className="px-5 py-3">
                                <div className="text-gray-600">{lead.email ?? "—"}</div>
                                {lead.phone && (
                                  <div className="text-xs text-gray-400">{lead.phone}</div>
                                )}
                              </td>
                              <td className="px-5 py-3">
                                {lead.type ? (
                                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                    {lead.type}
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="px-5 py-3">
                                <SourceBadge source={lead.source} />
                              </td>
                              <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                                {new Date(lead.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-5 py-10 text-center text-gray-400">
                      No leads recorded yet.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Leads Tab */}
            {activeTab === "leads" && (
              <>
                {/* Filters + Export */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <select
                    value={sourceFilter}
                    onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
                    className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">All Sources</option>
                    <option value="quote_form">Quote Form</option>
                    <option value="chatbot">Chatbot</option>
                    <option value="phone_click">Phone Click</option>
                    <option value="contact_form">Contact Form</option>
                  </select>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">All Types</option>
                    {(stats?.byType || []).map(({ type }) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <div className="flex-1" />
                  <span className="text-xs text-gray-500">
                    {totalLeads} total lead{totalLeads !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={exportCSV}
                    className="rounded-lg border bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Export CSV
                  </button>
                </div>

                {/* Leads Table */}
                <div className="mt-4 rounded-xl border bg-white shadow-sm">
                  {filteredLeads.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">Phone</th>
                            <th className="px-5 py-3">Type</th>
                            <th className="px-5 py-3">Source</th>
                            <th className="px-5 py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredLeads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-gray-50">
                              <td className="px-5 py-3 font-medium text-gray-900">{lead.name ?? "—"}</td>
                              <td className="px-5 py-3 text-gray-600">{lead.email ?? "—"}</td>
                              <td className="px-5 py-3 text-gray-600">{lead.phone ?? "—"}</td>
                              <td className="px-5 py-3">
                                {lead.type ? (
                                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                    {lead.type}
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="px-5 py-3">
                                <SourceBadge source={lead.source} />
                              </td>
                              <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                                {new Date(lead.created_at).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-5 py-10 text-center text-gray-400">
                      No leads match the current filters.
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalLeads > PAGE_SIZE && (
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="rounded-lg border bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-500">
                      Page {page + 1} of {Math.ceil(totalLeads / PAGE_SIZE)}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={(page + 1) * PAGE_SIZE >= totalLeads}
                      className="rounded-lg border bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <ApiKeysPanel secret={secret} projectId={selectedProject.id} />
                <NotificationsPanel secret={secret} projectId={selectedProject.id} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
