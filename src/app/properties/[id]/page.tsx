"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase, type Property, type Obligation, type Tenant, type Transaction, type Mortgage } from "@/lib/supabase";
import { formatCurrency, formatCurrencyFull, formatDate, daysUntil, urgencyColor, categoryLabel, propertyTypeLabel } from "@/lib/format";
import { Building2, MapPin, Users, DollarSign, FileText, Plus, X, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mortgage, setMortgage] = useState<Mortgage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showObForm, setShowObForm] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [propRes, oblRes, tenRes, txRes, mortRes] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).single(),
        supabase.from("obligations").select("*").eq("property_id", id).eq("is_active", true).order("due_date"),
        supabase.from("tenants").select("*").eq("property_id", id).eq("is_active", true),
        supabase.from("transactions").select("*").eq("property_id", id).order("date", { ascending: false }).limit(20),
        supabase.from("mortgages").select("*").eq("property_id", id).limit(1),
      ]);
      setProperty(propRes.data);
      setObligations(oblRes.data || []);
      setTenants(tenRes.data || []);
      setTransactions(txRes.data || []);
      setMortgage(mortRes.data?.[0] || null);
      setLoading(false);
    }
    load();
  }, [id]);

  async function addObligation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("obligations").insert({
      property_id: id,
      category: form.get("category"),
      name: form.get("name"),
      amount: Number(form.get("amount")),
      frequency: form.get("frequency"),
      due_date: form.get("due_date") || null,
      auto_pay: form.get("auto_pay") === "true",
      provider: form.get("provider") || null,
    });
    setShowObForm(false);
    const { data } = await supabase.from("obligations").select("*").eq("property_id", id).eq("is_active", true).order("due_date");
    setObligations(data || []);
  }

  async function addTenant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("tenants").insert({
      property_id: id,
      name: form.get("name"),
      email: form.get("email") || null,
      phone: form.get("phone") || null,
      monthly_rent: form.get("monthly_rent") ? Number(form.get("monthly_rent")) : null,
      lease_start: form.get("lease_start") || null,
      lease_end: form.get("lease_end") || null,
      security_deposit: form.get("security_deposit") ? Number(form.get("security_deposit")) : null,
    });
    setShowTenantForm(false);
    const { data } = await supabase.from("tenants").select("*").eq("property_id", id).eq("is_active", true);
    setTenants(data || []);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Loading...</div>;
  }

  if (!property) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Property not found.</div>;
  }

  const monthlyObs = obligations.filter(o => o.frequency === "monthly");
  const totalMonthly = monthlyObs.reduce((s, o) => s + (o.amount || 0), 0);
  const totalRent = tenants.reduce((s, t) => s + (t.monthly_rent || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link href="/properties" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
        <ArrowLeft size={14} /> Back to properties
      </Link>

      {/* Header */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/15 flex items-center justify-center text-accent-purple">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">{property.name}</h1>
              <p className="text-sm text-text-muted flex items-center gap-1 mt-0.5">
                <MapPin size={14} /> {property.address}, {property.city}, {property.province} {property.postal_code}
              </p>
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full ${
            property.property_type === "primary_residence" ? "bg-accent-blue/15 text-accent-blue" : "bg-accent-green/15 text-accent-green"
          }`}>
            {propertyTypeLabel(property.property_type)}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div>
            <p className="text-xs text-text-muted">Current Value</p>
            <p className="text-lg font-bold">{formatCurrency(property.current_value)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Purchase Price</p>
            <p className="text-lg font-bold">{formatCurrency(property.purchase_price)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Monthly Costs</p>
            <p className="text-lg font-bold text-accent-red">{formatCurrency(totalMonthly)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Monthly Rent</p>
            <p className="text-lg font-bold text-accent-green">{formatCurrency(totalRent)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Net Monthly</p>
            <p className={`text-lg font-bold ${totalRent - totalMonthly >= 0 ? "text-accent-green" : "text-accent-red"}`}>
              {formatCurrency(totalRent - totalMonthly)}
            </p>
          </div>
        </div>

        {property.is_strata && property.strata_plan && (
          <p className="text-xs text-text-muted mt-3">Strata Plan: {property.strata_plan}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Obligations */}
        <div className="bg-bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <DollarSign size={18} className="text-accent-blue" />
              Obligations
            </h2>
            <button onClick={() => setShowObForm(true)} className="text-xs text-accent-blue hover:underline flex items-center gap-1">
              <Plus size={14} /> Add
            </button>
          </div>

          {showObForm && (
            <div className="p-5 border-b border-border">
              <form onSubmit={addObligation} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Name</label>
                    <input name="name" required placeholder="e.g. 2026 Property Tax" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Category</label>
                    <select name="category" required>
                      <option value="property_tax">Property Tax</option>
                      <option value="strata_fee">Strata Fee</option>
                      <option value="insurance">Insurance</option>
                      <option value="mortgage">Mortgage</option>
                      <option value="utilities">Utilities</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="speculation_tax">Speculation Tax</option>
                      <option value="special_levy">Special Levy</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Amount</label>
                    <input name="amount" type="number" step="0.01" required placeholder="500" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Frequency</label>
                    <select name="frequency" required>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="semi_annual">Semi-Annual</option>
                      <option value="annual">Annual</option>
                      <option value="one_time">One-time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Due Date</label>
                    <input name="due_date" type="date" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Provider</label>
                    <input name="provider" placeholder="e.g. ICBC, City of Kelowna" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Auto-pay?</label>
                    <select name="auto_pay">
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowObForm(false)} className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg">Cancel</button>
                  <button type="submit" className="px-3 py-1.5 text-xs bg-accent-blue text-white rounded-lg">Add</button>
                </div>
              </form>
            </div>
          )}

          <div className="divide-y divide-border">
            {obligations.length === 0 ? (
              <div className="p-6 text-center text-text-muted text-sm">No obligations set up yet.</div>
            ) : (
              obligations.map(ob => {
                const days = daysUntil(ob.due_date);
                return (
                  <div key={ob.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{ob.name}</p>
                      <p className="text-xs text-text-muted">
                        {categoryLabel(ob.category)} -- {ob.frequency}
                        {ob.auto_pay && <span className="ml-1 text-accent-green">Auto-pay</span>}
                        {ob.provider && <span className="ml-1">-- {ob.provider}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(ob.amount)}</p>
                      {ob.due_date && (
                        <p className={`text-xs ${urgencyColor(days)}`}>{formatDate(ob.due_date)}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Tenants */}
        <div className="bg-bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Users size={18} className="text-accent-green" />
              Tenants
            </h2>
            {property.property_type === "rental" && (
              <button onClick={() => setShowTenantForm(true)} className="text-xs text-accent-blue hover:underline flex items-center gap-1">
                <Plus size={14} /> Add
              </button>
            )}
          </div>

          {showTenantForm && (
            <div className="p-5 border-b border-border">
              <form onSubmit={addTenant} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Name</label>
                    <input name="name" required placeholder="Tenant name" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Email</label>
                    <input name="email" type="email" placeholder="tenant@email.com" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Phone</label>
                    <input name="phone" placeholder="250-555-0123" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Monthly Rent</label>
                    <input name="monthly_rent" type="number" placeholder="2000" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Lease Start</label>
                    <input name="lease_start" type="date" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Lease End</label>
                    <input name="lease_end" type="date" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Security Deposit</label>
                    <input name="security_deposit" type="number" placeholder="1000" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowTenantForm(false)} className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg">Cancel</button>
                  <button type="submit" className="px-3 py-1.5 text-xs bg-accent-blue text-white rounded-lg">Add</button>
                </div>
              </form>
            </div>
          )}

          <div className="divide-y divide-border">
            {property.property_type !== "rental" ? (
              <div className="p-6 text-center text-text-muted text-sm">Primary residence -- no tenants.</div>
            ) : tenants.length === 0 ? (
              <div className="p-6 text-center text-text-muted text-sm">No tenants on record.</div>
            ) : (
              tenants.map(t => (
                <div key={t.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-text-muted">
                        {t.email && <span>{t.email} </span>}
                        {t.phone && <span>-- {t.phone}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-accent-green">{formatCurrency(t.monthly_rent)}/mo</p>
                      <p className="text-xs text-text-muted">
                        {t.lease_start && formatDate(t.lease_start)}
                        {t.lease_end ? ` to ${formatDate(t.lease_end)}` : " -- Month-to-month"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mortgage */}
      {mortgage && (
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Mortgage Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-text-muted">Lender</p>
              <p className="text-sm font-medium">{mortgage.lender}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Balance</p>
              <p className="text-sm font-medium">{formatCurrency(mortgage.current_balance)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Rate</p>
              <p className="text-sm font-medium">{mortgage.interest_rate}% {mortgage.rate_type}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Payment</p>
              <p className="text-sm font-medium">{formatCurrencyFull(mortgage.payment_amount)}/{mortgage.payment_frequency}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Renewal</p>
              <p className="text-sm font-medium">{formatDate(mortgage.term_end)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-bg-card border border-border rounded-xl">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText size={18} className="text-accent-orange" />
            Recent Transactions
          </h2>
        </div>
        {transactions.length === 0 ? (
          <div className="p-6 text-center text-text-muted text-sm">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="text-text-muted">{formatDate(tx.date)}</td>
                    <td>{tx.description || categoryLabel(tx.category)}</td>
                    <td><span className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary">{categoryLabel(tx.category)}</span></td>
                    <td className={`text-right font-medium ${tx.type === "income" ? "text-accent-green" : "text-accent-red"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrencyFull(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
