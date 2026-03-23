"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase, type Property, type Transaction, type Budget } from "@/lib/supabase";
import { formatCurrency, formatCurrencyFull, formatDate, categoryLabel } from "@/lib/format";
import { DollarSign, Plus, X, TrendingUp, TrendingDown, Target, ChevronDown, ChevronUp } from "lucide-react";

export default function FinancesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [budgetPropertyFilter, setBudgetPropertyFilter] = useState("all");
  const [budgetForm, setBudgetForm] = useState({
    property_id: "",
    category: "maintenance",
    annual_budget: "",
    notes: "",
  });

  useEffect(() => {
    async function load() {
      const [propRes, txRes, budgetRes] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("transactions").select("*").order("date", { ascending: false }).limit(100),
        supabase.from("budgets").select("*").eq("year", new Date().getFullYear()),
      ]);
      setProperties(propRes.data || []);
      setTransactions(txRes.data || []);
      setBudgets(budgetRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function addTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("transactions").insert({
      property_id: form.get("property_id"),
      type: form.get("type"),
      category: form.get("category"),
      description: form.get("description"),
      amount: Number(form.get("amount")),
      date: form.get("date"),
      is_tax_deductible: form.get("is_tax_deductible") === "true",
    });
    setShowForm(false);
    const { data } = await supabase.from("transactions").select("*").order("date", { ascending: false }).limit(100);
    setTransactions(data || []);
  }

  const currentYear = new Date().getFullYear();

  async function addBudget(e: React.FormEvent) {
    e.preventDefault();
    const annualBudget = Number(budgetForm.annual_budget);
    await supabase.from("budgets").upsert({
      property_id: budgetForm.property_id || properties[0]?.id,
      category: budgetForm.category,
      year: currentYear,
      annual_budget: annualBudget,
      monthly_budget: Math.round(annualBudget / 12),
      notes: budgetForm.notes || null,
    }, { onConflict: "property_id,category,year" });
    setShowBudgetForm(false);
    setBudgetForm({ property_id: "", category: "maintenance", annual_budget: "", notes: "" });
    const { data } = await supabase.from("budgets").select("*").eq("year", currentYear);
    setBudgets(data || []);
  }

  // Compute actual spend per property+category for current year
  const yearTransactions = transactions.filter(tx => tx.date.startsWith(String(currentYear)));
  const actualSpend: Record<string, number> = {};
  yearTransactions.forEach(tx => {
    if (tx.type === "expense") {
      const key = `${tx.property_id}__${tx.category}`;
      actualSpend[key] = (actualSpend[key] || 0) + tx.amount;
    }
  });

  const filteredBudgets = budgets.filter(b =>
    budgetPropertyFilter === "all" || b.property_id === budgetPropertyFilter
  );

  const filtered = transactions.filter(tx => {
    if (filter !== "all" && tx.type !== filter) return false;
    if (propertyFilter !== "all" && tx.property_id !== propertyFilter) return false;
    return true;
  });

  const totalIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finances</h1>
          <p className="text-text-muted text-sm mt-1">Income, expenses, and budget tracking</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-accent-green" />
            <span className="text-xs text-text-muted uppercase tracking-wide">Total Income</span>
          </div>
          <p className="text-2xl font-bold text-accent-green">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-accent-red" />
            <span className="text-xs text-text-muted uppercase tracking-wide">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-accent-red">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-accent-blue" />
            <span className="text-xs text-text-muted uppercase tracking-wide">Net Cash Flow</span>
          </div>
          <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-accent-green" : "text-accent-red"}`}>
            {formatCurrency(totalIncome - totalExpenses)}
          </p>
        </div>
      </div>

      {showForm && (
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Add Transaction</h2>
            <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary"><X size={20} /></button>
          </div>
          <form onSubmit={addTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">Property</label>
              <select name="property_id" required>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Type</label>
              <select name="type" required>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Category</label>
              <select name="category" required>
                <option value="rent">Rent</option>
                <option value="property_tax">Property Tax</option>
                <option value="strata_fee">Strata Fee</option>
                <option value="insurance">Insurance</option>
                <option value="mortgage">Mortgage</option>
                <option value="utilities">Utilities</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Amount</label>
              <input name="amount" type="number" step="0.01" required placeholder="1500.00" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Date</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Description</label>
              <input name="description" placeholder="Monthly rent payment" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Tax Deductible?</label>
              <select name="is_tax_deductible">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-bg-card-hover">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600">Add</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="w-auto">
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
        </select>
        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)} className="w-auto">
          <option value="all">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">No transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Property</th>
                  <th>Tax Ded.</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => {
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
                      <td>{tx.is_tax_deductible ? <span className="text-accent-green text-xs">Yes</span> : <span className="text-text-muted text-xs">No</span>}</td>
                      <td className={`text-right font-medium ${tx.type === "income" ? "text-accent-green" : "text-accent-red"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrencyFull(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Budgets Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-accent-blue" />
            <h2 className="text-lg font-semibold">Budgets {currentYear}</h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={budgetPropertyFilter}
              onChange={e => setBudgetPropertyFilter(e.target.value)}
              className="w-auto text-sm"
            >
              <option value="all">All properties</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button
              onClick={() => setShowBudgetForm(!showBudgetForm)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus size={15} /> Add Budget
            </button>
          </div>
        </div>

        {showBudgetForm && (
          <div className="bg-bg-card border border-border rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm">Add / Update Budget</h3>
              <button onClick={() => setShowBudgetForm(false)} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
            </div>
            <form onSubmit={addBudget} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">Property</label>
                <select
                  required
                  value={budgetForm.property_id}
                  onChange={e => setBudgetForm(f => ({ ...f, property_id: e.target.value }))}
                >
                  <option value="">Select property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Category</label>
                <select
                  value={budgetForm.category}
                  onChange={e => setBudgetForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="property_tax">Property Tax</option>
                  <option value="strata_fee">Strata Fee</option>
                  <option value="insurance">Insurance</option>
                  <option value="mortgage">Mortgage</option>
                  <option value="utilities">Utilities</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Annual Budget ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="5000.00"
                  value={budgetForm.annual_budget}
                  onChange={e => setBudgetForm(f => ({ ...f, annual_budget: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Notes</label>
                <input
                  placeholder="Optional notes"
                  value={budgetForm.notes}
                  onChange={e => setBudgetForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-1">
                <button type="button" onClick={() => setShowBudgetForm(false)} className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-bg-card-hover">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600">Save Budget</button>
              </div>
            </form>
          </div>
        )}

        {filteredBudgets.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-text-muted text-sm">
            No budgets set for {currentYear}. Add one above.
          </div>
        ) : (
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Category</th>
                    <th className="text-right">Annual Budget</th>
                    <th className="text-right">Actual Spend</th>
                    <th className="text-right">Remaining</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBudgets.map(b => {
                    const prop = properties.find(p => p.id === b.property_id);
                    const key = `${b.property_id}__${b.category}`;
                    const spent = actualSpend[key] || 0;
                    const annual = b.annual_budget || 0;
                    const remaining = annual - spent;
                    const pct = annual > 0 ? Math.min(100, Math.round((spent / annual) * 100)) : 0;
                    const overBudget = spent > annual && annual > 0;
                    return (
                      <tr key={b.id} className="hover:bg-bg-card-hover transition-colors">
                        <td className="text-text-muted">{prop?.name || "--"}</td>
                        <td>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary">
                            {categoryLabel(b.category)}
                          </span>
                        </td>
                        <td className="text-right font-medium">{formatCurrency(annual)}</td>
                        <td className={`text-right font-medium ${overBudget ? "text-accent-red" : "text-text-primary"}`}>
                          {formatCurrency(spent)}
                        </td>
                        <td className={`text-right font-medium ${remaining < 0 ? "text-accent-red" : remaining < annual * 0.1 ? "text-accent-orange" : "text-accent-green"}`}>
                          {remaining < 0 ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
                        </td>
                        <td className="min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${overBudget ? "bg-accent-red" : pct > 80 ? "bg-accent-orange" : "bg-accent-blue"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium w-9 text-right ${overBudget ? "text-accent-red" : "text-text-muted"}`}>
                              {pct}%
                            </span>
                          </div>
                          {b.notes && <p className="text-xs text-text-muted mt-0.5">{b.notes}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
