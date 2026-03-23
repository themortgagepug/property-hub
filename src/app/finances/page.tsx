"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase, type Property, type Transaction, type Budget } from "@/lib/supabase";
import { formatCurrency, formatCurrencyFull, formatDate, categoryLabel } from "@/lib/format";
import { DollarSign, Plus, X, TrendingUp, TrendingDown } from "lucide-react";

export default function FinancesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [propertyFilter, setPropertyFilter] = useState("all");

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
    </div>
  );
}
