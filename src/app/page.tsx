"use client";

import { useEffect, useState } from "react";
import { supabase, type Property, type Obligation, type Alert, type Transaction } from "@/lib/supabase";
import { formatCurrency, formatDate, daysUntil, urgencyColor, categoryLabel } from "@/lib/format";
import {
  Building2,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [propRes, oblRes, alertRes, txRes] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("obligations").select("*").eq("is_active", true).order("due_date"),
        supabase.from("alerts").select("*").eq("status", "pending").order("due_date"),
        supabase.from("transactions").select("*").order("date", { ascending: false }).limit(20),
      ]);
      setProperties(propRes.data || []);
      setObligations(oblRes.data || []);
      setAlerts(alertRes.data || []);
      setTransactions(txRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const totalValue = properties.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const monthlyIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const pendingAlerts = alerts.filter(a => a.status === "pending");
  const upcomingObligations = obligations
    .filter(o => o.due_date && daysUntil(o.due_date)! <= 60)
    .sort((a, b) => (daysUntil(a.due_date) || 999) - (daysUntil(b.due_date) || 999));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-text-muted">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-text-muted text-sm mt-1">
          {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Portfolio Value"
          value={formatCurrency(totalValue)}
          icon={<Building2 size={20} />}
          color="blue"
          detail={`${properties.length} properties`}
        />
        <StatCard
          label="Monthly Income"
          value={formatCurrency(monthlyIncome)}
          icon={<ArrowUpRight size={20} />}
          color="green"
          detail="Rental income"
        />
        <StatCard
          label="Monthly Expenses"
          value={formatCurrency(monthlyExpenses)}
          icon={<ArrowDownRight size={20} />}
          color="red"
          detail="All properties"
        />
        <StatCard
          label="Action Items"
          value={String(pendingAlerts.length)}
          icon={<AlertTriangle size={20} />}
          color={pendingAlerts.length > 0 ? "orange" : "green"}
          detail={pendingAlerts.length > 0 ? "Needs attention" : "All clear"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Due */}
        <div className="lg:col-span-2 bg-bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock size={18} className="text-accent-blue" />
              Upcoming Due
            </h2>
            <Link href="/calendar" className="text-xs text-accent-blue hover:underline flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {upcomingObligations.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">
                No upcoming obligations. Add properties to get started.
              </div>
            ) : (
              upcomingObligations.slice(0, 8).map(ob => {
                const days = daysUntil(ob.due_date);
                const prop = properties.find(p => p.id === ob.property_id);
                return (
                  <div key={ob.id} className="flex items-center justify-between px-5 py-3 hover:bg-bg-card-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${days !== null && days < 0 ? "bg-accent-red" : days !== null && days <= 7 ? "bg-accent-orange" : days !== null && days <= 30 ? "bg-accent-yellow" : "bg-accent-green"}`} />
                      <div>
                        <p className="text-sm font-medium">{ob.name}</p>
                        <p className="text-xs text-text-muted">{prop?.name || "Unknown property"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(ob.amount)}</p>
                      <p className={`text-xs ${urgencyColor(days)}`}>
                        {days !== null
                          ? days < 0
                            ? `${Math.abs(days)} days overdue`
                            : days === 0
                            ? "Due today"
                            : `${days} days`
                          : "No date"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Bell size={18} className="text-accent-orange" />
              Alerts
            </h2>
            <Link href="/alerts" className="text-xs text-accent-blue hover:underline flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {pendingAlerts.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-accent-green" />
                All clear. No pending alerts.
              </div>
            ) : (
              pendingAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="px-5 py-3 hover:bg-bg-card-hover transition-colors">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 ${
                      alert.priority === "urgent" ? "text-accent-red" :
                      alert.priority === "high" ? "text-accent-orange" :
                      "text-accent-yellow"
                    }`}>
                      <AlertTriangle size={14} />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      {alert.description && (
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{alert.description}</p>
                      )}
                      {alert.due_date && (
                        <p className="text-xs text-text-muted mt-1">{formatDate(alert.due_date)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Properties Overview */}
      <div className="bg-bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Building2 size={18} className="text-accent-purple" />
            Properties
          </h2>
          <Link href="/properties" className="text-xs text-accent-blue hover:underline flex items-center gap-1">
            Manage <ChevronRight size={14} />
          </Link>
        </div>
        {properties.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 size={40} className="mx-auto mb-3 text-text-muted" />
            <p className="text-text-muted text-sm mb-4">No properties yet. Let&apos;s add your portfolio.</p>
            <Link href="/properties" className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
              Add Property
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            {properties.map(prop => {
              const propObligations = obligations.filter(o => o.property_id === prop.id);
              const monthlyTotal = propObligations
                .filter(o => o.frequency === "monthly")
                .reduce((sum, o) => sum + (o.amount || 0), 0);
              return (
                <Link
                  key={prop.id}
                  href={`/properties/${prop.id}`}
                  className="border border-border rounded-lg p-4 hover:bg-bg-card-hover transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{prop.name}</h3>
                      <p className="text-xs text-text-muted mt-0.5">{prop.address}, {prop.city}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      prop.property_type === "primary_residence" ? "bg-accent-blue/15 text-accent-blue" :
                      "bg-accent-green/15 text-accent-green"
                    }`}>
                      {prop.property_type === "primary_residence" ? "Primary" : "Rental"}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 mt-3">
                    <div>
                      <p className="text-xs text-text-muted">Value</p>
                      <p className="text-sm font-semibold">{formatCurrency(prop.current_value)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Monthly costs</p>
                      <p className="text-sm font-semibold">{formatCurrency(monthlyTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Obligations</p>
                      <p className="text-sm font-semibold">{propObligations.length}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <DollarSign size={18} className="text-accent-green" />
            Recent Transactions
          </h2>
          <Link href="/finances" className="text-xs text-accent-blue hover:underline flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No transactions yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Property</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map(tx => {
                  const prop = properties.find(p => p.id === tx.property_id);
                  return (
                    <tr key={tx.id} className="hover:bg-bg-card-hover transition-colors">
                      <td className="text-text-muted">{formatDate(tx.date)}</td>
                      <td>{tx.description || categoryLabel(tx.category)}</td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary">
                          {categoryLabel(tx.category)}
                        </span>
                      </td>
                      <td className="text-text-muted">{prop?.name || "--"}</td>
                      <td className={`text-right font-medium ${tx.type === "income" ? "text-accent-green" : "text-accent-red"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, detail }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "red" | "orange" | "purple";
  detail: string;
}) {
  const colors = {
    blue: "bg-accent-blue/15 text-accent-blue",
    green: "bg-accent-green/15 text-accent-green",
    red: "bg-accent-red/15 text-accent-red",
    orange: "bg-accent-orange/15 text-accent-orange",
    purple: "bg-accent-purple/15 text-accent-purple",
  };
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-text-muted mt-1">{detail}</p>
    </div>
  );
}
