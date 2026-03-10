"use client";

import { useEffect, useState } from "react";

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
  client_id: string;
  source: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  type: string | null;
  created_at: string;
};

const API_KEY = "ulk_sparks_sk-lead-tracker-001";

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { "x-api-key": API_KEY };

    Promise.all([
      fetch("/api/leads/stats", { headers }).then((r) => r.json()),
      fetch("/api/leads?limit=20", { headers }).then((r) => r.json()),
    ])
      .then(([statsData, leadsData]) => {
        setStats(statsData);
        setLeads(leadsData.leads ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900">
          UnlockAI Lead Tracker
        </h1>
        <p className="mt-1 text-gray-500">
          Tracking leads for{" "}
          <span className="font-medium text-gray-700">sparks-insurance</span>
        </p>

        {/* Stat Cards */}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Total Leads", value: stats?.total ?? 0 },
            { label: "Today", value: stats?.today ?? 0 },
            { label: "This Week", value: stats?.thisWeek ?? 0 },
            { label: "This Month", value: stats?.thisMonth ?? 0 },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Breakdowns */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">By Source</h2>
            {stats?.bySource.length ? (
              <div className="mt-3 space-y-2">
                {stats.bySource.map(({ source, count }) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
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
            <h2 className="text-lg font-semibold text-gray-900">
              By Insurance Type
            </h2>
            {stats?.byType.length ? (
              <div className="mt-3 space-y-2">
                {stats.byType.map(({ type, count }) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
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
        </div>

        {/* Recent Leads */}
        <div className="mt-8 rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Leads
            </h2>
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
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {lead.name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {lead.email ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {lead.phone ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        {lead.type ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {lead.type}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{lead.source}</td>
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
              No leads recorded yet. Leads will appear here once your app starts
              sending them.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
