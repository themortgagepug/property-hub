"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase, type Property, type Transaction, type Obligation, type Mortgage } from "@/lib/supabase";
import { formatCurrency, formatCurrencyFull, categoryLabel } from "@/lib/format";
import { TrendingUp, Building2, ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";

type PropertyPerformance = {
  property: Property;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  capRate: number | null;
  mortgage: Mortgage | null;
  expenseBreakdown: Record<string, number>;
};

export default function PerformancePage() {
  const [performances, setPerformances] = useState<PropertyPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [propRes, txRes, mortRes] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("transactions").select("*"),
        supabase.from("mortgages").select("*"),
      ]);

      const properties = propRes.data || [];
      const transactions = txRes.data || [];
      const mortgages = mortRes.data || [];

      const perfs: PropertyPerformance[] = properties.map(property => {
        const propTx = transactions.filter(t => t.property_id === property.id);
        const income = propTx.filter(t => t.type === "income");
        const expenses = propTx.filter(t => t.type === "expense");
        const totalIncome = income.reduce((s, t) => s + t.amount, 0);
        const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
        const months = Math.max(1, new Set(propTx.map(t => t.date.substring(0, 7))).size);

        const expenseBreakdown: Record<string, number> = {};
        expenses.forEach(t => {
          expenseBreakdown[t.category] = (expenseBreakdown[t.category] || 0) + t.amount;
        });

        const noi = totalIncome - totalExpenses;
        const capRate = property.current_value ? (noi / property.current_value) * 100 : null;
        const mortgage = mortgages.find(m => m.property_id === property.id) || null;

        return {
          property,
          totalIncome,
          totalExpenses,
          netCashFlow: noi,
          monthlyIncome: totalIncome / months,
          monthlyExpenses: totalExpenses / months,
          capRate,
          mortgage,
          expenseBreakdown,
        };
      });

      setPerformances(perfs);
      setLoading(false);
    }
    load();
  }, []);

  const portfolioIncome = performances.reduce((s, p) => s + p.totalIncome, 0);
  const portfolioExpenses = performances.reduce((s, p) => s + p.totalExpenses, 0);
  const portfolioValue = performances.reduce((s, p) => s + (p.property.current_value || 0), 0);
  const portfolioEquity = portfolioValue - performances.reduce((s, p) => s + (p.mortgage?.current_balance || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance</h1>
        <p className="text-text-muted text-sm mt-1">Portfolio analysis and property-level metrics</p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <span className="text-xs text-text-muted uppercase tracking-wide">Portfolio Value</span>
          <p className="text-2xl font-bold mt-1">{formatCurrency(portfolioValue)}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <span className="text-xs text-text-muted uppercase tracking-wide">Total Equity</span>
          <p className="text-2xl font-bold mt-1 text-accent-green">{formatCurrency(portfolioEquity)}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <span className="text-xs text-text-muted uppercase tracking-wide">Total Income</span>
          <p className="text-2xl font-bold mt-1">{formatCurrency(portfolioIncome)}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <span className="text-xs text-text-muted uppercase tracking-wide">Net Cash Flow</span>
          <p className={`text-2xl font-bold mt-1 ${portfolioIncome - portfolioExpenses >= 0 ? "text-accent-green" : "text-accent-red"}`}>
            {formatCurrency(portfolioIncome - portfolioExpenses)}
          </p>
        </div>
      </div>

      {/* Per-Property Performance */}
      {performances.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <TrendingUp size={48} className="mx-auto mb-4 text-text-muted" />
          <h3 className="font-semibold text-lg mb-2">No data yet</h3>
          <p className="text-text-muted text-sm">Add properties and transactions to see performance metrics.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {performances.map(perf => (
            <div key={perf.property.id} className="bg-bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-purple/15 flex items-center justify-center text-accent-purple">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{perf.property.name}</h3>
                    <p className="text-xs text-text-muted">{perf.property.address}, {perf.property.city}</p>
                  </div>
                </div>
                {perf.capRate !== null && (
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Cap Rate</p>
                    <p className={`text-lg font-bold ${perf.capRate >= 5 ? "text-accent-green" : perf.capRate >= 3 ? "text-accent-yellow" : "text-accent-red"}`}>
                      {perf.capRate.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-text-muted">Value</p>
                  <p className="text-sm font-semibold">{formatCurrency(perf.property.current_value)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Monthly Income</p>
                  <p className="text-sm font-semibold text-accent-green">{formatCurrency(perf.monthlyIncome)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Monthly Expenses</p>
                  <p className="text-sm font-semibold text-accent-red">{formatCurrency(perf.monthlyExpenses)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Net Monthly</p>
                  <p className={`text-sm font-semibold ${perf.monthlyIncome - perf.monthlyExpenses >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                    {formatCurrency(perf.monthlyIncome - perf.monthlyExpenses)}
                  </p>
                </div>
                {perf.mortgage && (
                  <div>
                    <p className="text-xs text-text-muted">Mortgage Balance</p>
                    <p className="text-sm font-semibold">{formatCurrency(perf.mortgage.current_balance)}</p>
                  </div>
                )}
              </div>

              {Object.keys(perf.expenseBreakdown).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-text-muted mb-2">Expense Breakdown</p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(perf.expenseBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, amount]) => (
                        <div key={cat} className="text-xs">
                          <span className="text-text-secondary">{categoryLabel(cat)}: </span>
                          <span className="font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
