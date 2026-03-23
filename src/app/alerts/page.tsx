"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase, type Alert, type Property } from "@/lib/supabase";
import { formatDate, daysUntil } from "@/lib/format";
import { Bell, AlertTriangle, CheckCircle2, Clock, Eye, X } from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "completed" | "all">("pending");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [alertRes, propRes] = await Promise.all([
      supabase.from("alerts").select("*").order("due_date"),
      supabase.from("properties").select("*"),
    ]);
    setAlerts(alertRes.data || []);
    setProperties(propRes.data || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("alerts").update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    }).eq("id", id);
    loadData();
  }

  const filtered = alerts.filter(a => {
    if (filter === "pending") return a.status === "pending" || a.status === "acknowledged";
    if (filter === "completed") return a.status === "completed" || a.status === "dismissed";
    return true;
  });

  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

  const sorted = [...filtered].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return da - db;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-text-muted text-sm mt-1">Action items and reminders across your portfolio</p>
      </div>

      <div className="flex gap-2">
        {(["pending", "completed", "all"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? "bg-accent-blue/15 text-accent-blue" : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-accent-green" />
          <h3 className="font-semibold text-lg mb-2">All clear</h3>
          <p className="text-text-muted text-sm">No {filter === "all" ? "" : filter} alerts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(alert => {
            const prop = properties.find(p => p.id === alert.property_id);
            const days = daysUntil(alert.due_date);
            const isDone = alert.status === "completed" || alert.status === "dismissed";

            return (
              <div key={alert.id} className={`bg-bg-card border border-border rounded-xl p-5 ${isDone ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 ${
                      alert.priority === "urgent" ? "text-accent-red" :
                      alert.priority === "high" ? "text-accent-orange" :
                      alert.priority === "normal" ? "text-accent-yellow" :
                      "text-text-muted"
                    }`}>
                      {isDone ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{alert.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          alert.priority === "urgent" ? "bg-accent-red/15 text-accent-red" :
                          alert.priority === "high" ? "bg-accent-orange/15 text-accent-orange" :
                          "bg-bg-secondary text-text-secondary"
                        }`}>
                          {alert.priority}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary">
                          {alert.type}
                        </span>
                      </div>
                      {alert.description && (
                        <p className="text-sm text-text-secondary mt-1">{alert.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        {prop && <span>{prop.name}</span>}
                        {alert.due_date && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(alert.due_date)}
                            {days !== null && !isDone && (
                              <span className={days < 0 ? "text-accent-red" : days <= 7 ? "text-accent-orange" : ""}>
                                ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isDone && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateStatus(alert.id, "completed")}
                        className="p-1.5 rounded-lg hover:bg-accent-green/15 text-text-muted hover:text-accent-green transition-colors"
                        title="Complete"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button
                        onClick={() => updateStatus(alert.id, "dismissed")}
                        className="p-1.5 rounded-lg hover:bg-accent-red/15 text-text-muted hover:text-accent-red transition-colors"
                        title="Dismiss"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
