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
  created_at: string;
};

// ── Helpers ──

function adminHeaders(secret: string) {
  return { "Content-Type": "application/json", "x-admin-secret": secret };
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
        <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            Generate Key
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

// ── Main Dashboard ──

export default function Dashboard() {
  const [secret, setSecret] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

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

    Promise.all([
      fetch(`/api/leads/stats?projectId=${selectedId}`, { headers: h }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(`/api/leads?projectId=${selectedId}&limit=20`, { headers: h }).then((r) =>
        r.ok ? r.json() : null
      ),
    ]).then(([s, l]) => {
      if (s) setStats(s);
      else setStats(null);
      if (l) setLeads(l.leads ?? []);
      else setLeads([]);
    });
  }, [secret, selectedId]);

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

        <div className="mt-6 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
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
      <main className="flex-1 p-6 md:p-10">
        {!selectedProject ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            Create a project to get started
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedProject.name}
                </h2>
                <p className="text-sm text-gray-500">
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">
                    {selectedProject.slug}
                  </code>
                </p>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Total Leads", value: stats?.total ?? 0 },
                { label: "Today", value: stats?.today ?? 0 },
                { label: "This Week", value: stats?.thisWeek ?? 0 },
                { label: "This Month", value: stats?.thisMonth ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {/* Breakdowns + API Keys */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">By Source</h2>
                {stats?.bySource?.length ? (
                  <div className="mt-3 space-y-2">
                    {stats.bySource.map(({ source, count }) => (
                      <div key={source} className="flex items-center justify-between">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          {source}
                        </span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-400">No data yet</p>
                )}
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">By Type</h2>
                {stats?.byType?.length ? (
                  <div className="mt-3 space-y-2">
                    {stats.byType.map(({ type, count }) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                          {type}
                        </span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-400">No data yet</p>
                )}
              </div>

              <ApiKeysPanel secret={secret} projectId={selectedProject.id} />
            </div>

            {/* Recent Leads */}
            <div className="mt-6 rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
              </div>
              {leads.length ? (
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
                      {leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900">{lead.name ?? "—"}</td>
                          <td className="px-5 py-3 text-gray-600">{lead.email ?? "—"}</td>
                          <td className="px-5 py-3 text-gray-600">{lead.phone ?? "—"}</td>
                          <td className="px-5 py-3">
                            {lead.type ? (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {lead.type}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                              {lead.source}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500">
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
      </main>
    </div>
  );
}
