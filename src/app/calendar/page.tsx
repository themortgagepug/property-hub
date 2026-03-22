"use client";

import { useEffect, useState } from "react";
import { supabase, type Property, type Obligation } from "@/lib/supabase";
import { formatCurrency, formatDate, daysUntil, urgencyColor, categoryLabel } from "@/lib/format";
import { CalendarClock, CheckCircle2, AlertTriangle } from "lucide-react";

type MonthGroup = {
  label: string;
  items: (Obligation & { property?: Property })[];
};

export default function CalendarPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [propRes, oblRes] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("obligations").select("*").eq("is_active", true).order("due_date"),
      ]);
      setProperties(propRes.data || []);
      setObligations(oblRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const months: MonthGroup[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = d.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const items = obligations
      .filter(o => o.due_date && o.due_date.startsWith(monthStr))
      .map(o => ({ ...o, property: properties.find(p => p.id === o.property_id) }));

    if (items.length > 0) {
      months.push({ label, items });
    }
  }

  // Also include overdue
  const overdue = obligations
    .filter(o => o.due_date && daysUntil(o.due_date)! < 0)
    .map(o => ({ ...o, property: properties.find(p => p.id === o.property_id) }));

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-text-muted text-sm mt-1">All obligations across your portfolio, by month</p>
      </div>

      {overdue.length > 0 && (
        <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-5">
          <h2 className="font-semibold text-accent-red flex items-center gap-2 mb-3">
            <AlertTriangle size={18} /> Overdue
          </h2>
          <div className="space-y-2">
            {overdue.map(ob => (
              <div key={ob.id} className="flex items-center justify-between bg-bg-card rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{ob.name}</p>
                  <p className="text-xs text-text-muted">{ob.property?.name} -- {categoryLabel(ob.category)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(ob.amount)}</p>
                  <p className="text-xs text-accent-red">{formatDate(ob.due_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {months.length === 0 && overdue.length === 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <CalendarClock size={48} className="mx-auto mb-4 text-text-muted" />
          <h3 className="font-semibold text-lg mb-2">No obligations scheduled</h3>
          <p className="text-text-muted text-sm">Add properties and their obligations to see your calendar.</p>
        </div>
      )}

      {months.map(month => (
        <div key={month.label} className="bg-bg-card border border-border rounded-xl">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold">{month.label}</h2>
          </div>
          <div className="divide-y divide-border">
            {month.items.map(ob => {
              const days = daysUntil(ob.due_date);
              return (
                <div key={ob.id} className="flex items-center justify-between px-5 py-3 hover:bg-bg-card-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${days !== null && days <= 7 ? "bg-accent-orange" : "bg-accent-green"}`} />
                    <div>
                      <p className="text-sm font-medium">{ob.name}</p>
                      <p className="text-xs text-text-muted">
                        {ob.property?.name} -- {categoryLabel(ob.category)}
                        {ob.auto_pay && <span className="ml-2 text-accent-green">Auto-pay</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(ob.amount)}</p>
                    <p className={`text-xs ${urgencyColor(days)}`}>
                      {formatDate(ob.due_date)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
