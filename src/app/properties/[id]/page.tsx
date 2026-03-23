"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase, type Property, type Obligation, type Tenant, type Transaction, type Mortgage, type Unit } from "@/lib/supabase";
import { formatCurrency, formatCurrencyFull, formatDate, daysUntil, urgencyColor, categoryLabel, propertyTypeLabel } from "@/lib/format";
import { Building2, MapPin, Users, DollarSign, FileText, Plus, X, ArrowLeft, Pencil, Trash2, Home, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mortgage, setMortgage] = useState<Mortgage | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Add forms
  const [showObForm, setShowObForm] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitEditData, setUnitEditData] = useState<Partial<Unit>>({});

  // Edit states
  const [editingObId, setEditingObId] = useState<string | null>(null);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState(false);
  const [showMortgageForm, setShowMortgageForm] = useState(false);

  // Edit form data
  const [obEditData, setObEditData] = useState<Partial<Obligation>>({});
  const [tenantEditData, setTenantEditData] = useState<Partial<Tenant>>({});
  const [propEditData, setPropEditData] = useState<Partial<Property>>({});
  const [mortgageFormData, setMortgageFormData] = useState<Partial<Mortgage>>({});

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [propRes, oblRes, tenRes, txRes, mortRes, unitRes] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).single(),
        supabase.from("obligations").select("*").eq("property_id", id).eq("is_active", true).order("due_date"),
        supabase.from("tenants").select("*").eq("property_id", id).eq("is_active", true),
        supabase.from("transactions").select("*").eq("property_id", id).order("date", { ascending: false }).limit(20),
        supabase.from("mortgages").select("*").eq("property_id", id).limit(1),
        supabase.from("units").select("*").eq("property_id", id).order("created_at"),
      ]);
      setProperty(propRes.data);
      setObligations(oblRes.data || []);
      setTenants(tenRes.data || []);
      setTransactions(txRes.data || []);
      setMortgage(mortRes.data?.[0] || null);
      setUnits(unitRes.data || []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function reloadObligations() {
    const { data } = await supabase.from("obligations").select("*").eq("property_id", id).eq("is_active", true).order("due_date");
    setObligations(data || []);
  }

  async function reloadTenants() {
    const { data } = await supabase.from("tenants").select("*").eq("property_id", id).eq("is_active", true);
    setTenants(data || []);
  }

  async function reloadProperty() {
    const { data } = await supabase.from("properties").select("*").eq("id", id).single();
    setProperty(data);
  }

  async function reloadMortgage() {
    const { data } = await supabase.from("mortgages").select("*").eq("property_id", id).limit(1);
    setMortgage(data?.[0] || null);
  }

  async function reloadUnits() {
    const { data } = await supabase.from("units").select("*").eq("property_id", id).order("created_at");
    setUnits(data || []);
  }

  async function addUnit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("units").insert({
      property_id: id,
      name: form.get("name"),
      is_rented: form.get("is_rented") === "true",
      current_rent: form.get("current_rent") ? Number(form.get("current_rent")) : null,
      tenant_name: form.get("tenant_name") || null,
      tenant_email: form.get("tenant_email") || null,
      tenant_phone: form.get("tenant_phone") || null,
      lease_start: form.get("lease_start") || null,
      lease_end: form.get("lease_end") || null,
      notes: form.get("notes") || null,
    });
    setShowUnitForm(false);
    reloadUnits();
  }

  async function updateUnit(unitId: string) {
    const { name, is_rented, current_rent, tenant_name, tenant_email, tenant_phone, lease_start, lease_end, notes } = unitEditData;
    await supabase.from("units").update({
      name, is_rented,
      current_rent: current_rent ? Number(current_rent) : null,
      tenant_name: tenant_name || null,
      tenant_email: tenant_email || null,
      tenant_phone: tenant_phone || null,
      lease_start: lease_start || null,
      lease_end: lease_end || null,
      notes: notes || null,
    }).eq("id", unitId);
    setEditingUnitId(null);
    reloadUnits();
  }

  async function deleteUnit(unitId: string) {
    if (!window.confirm("Delete this unit?")) return;
    await supabase.from("units").delete().eq("id", unitId);
    reloadUnits();
  }

  // Obligations
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
    reloadObligations();
  }

  function startEditObligation(ob: Obligation) {
    setObEditData({ ...ob });
    setEditingObId(ob.id);
    setShowObForm(false);
  }

  async function saveObligation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingObId) return;
    await supabase.from("obligations").update({
      category: obEditData.category,
      name: obEditData.name,
      amount: obEditData.amount,
      frequency: obEditData.frequency,
      due_date: obEditData.due_date || null,
      auto_pay: obEditData.auto_pay,
      provider: obEditData.provider || null,
    }).eq("id", editingObId);
    setEditingObId(null);
    setObEditData({});
    reloadObligations();
  }

  async function deleteObligation(obId: string) {
    if (!window.confirm("Delete this obligation?")) return;
    await supabase.from("obligations").delete().eq("id", obId);
    reloadObligations();
  }

  // Tenants
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
    reloadTenants();
  }

  function startEditTenant(t: Tenant) {
    setTenantEditData({ ...t });
    setEditingTenantId(t.id);
    setShowTenantForm(false);
  }

  async function saveTenant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingTenantId) return;
    await supabase.from("tenants").update({
      name: tenantEditData.name,
      email: tenantEditData.email || null,
      phone: tenantEditData.phone || null,
      monthly_rent: tenantEditData.monthly_rent ?? null,
      lease_start: tenantEditData.lease_start || null,
      lease_end: tenantEditData.lease_end || null,
      security_deposit: tenantEditData.security_deposit ?? null,
    }).eq("id", editingTenantId);
    setEditingTenantId(null);
    setTenantEditData({});
    reloadTenants();
  }

  async function deleteTenant(tenantId: string) {
    if (!window.confirm("Remove this tenant?")) return;
    await supabase.from("tenants").delete().eq("id", tenantId);
    reloadTenants();
  }

  // Property edit
  function startEditProperty() {
    if (!property) return;
    setPropEditData({ ...property });
    setEditingProperty(true);
  }

  async function saveProperty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!property) return;
    await supabase.from("properties").update({
      name: propEditData.name,
      address: propEditData.address,
      city: propEditData.city,
      province: propEditData.province,
      postal_code: propEditData.postal_code || null,
      property_type: propEditData.property_type,
      is_strata: propEditData.is_strata,
      purchase_price: propEditData.purchase_price ?? null,
      current_value: propEditData.current_value ?? null,
      bedrooms: propEditData.bedrooms ?? null,
      bathrooms: propEditData.bathrooms ?? null,
      strata_plan: propEditData.strata_plan || null,
    }).eq("id", property.id);
    setEditingProperty(false);
    reloadProperty();
  }

  // Mortgage
  function startMortgageForm() {
    if (mortgage) {
      setMortgageFormData({ ...mortgage });
    } else {
      setMortgageFormData({
        lender: "",
        original_amount: null,
        current_balance: null,
        interest_rate: null,
        rate_type: "fixed",
        term_start: null,
        term_end: null,
        payment_amount: null,
        payment_frequency: "monthly",
      });
    }
    setShowMortgageForm(true);
  }

  async function saveMortgage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = {
      property_id: id,
      lender: mortgageFormData.lender || "",
      original_amount: mortgageFormData.original_amount ?? null,
      current_balance: mortgageFormData.current_balance ?? null,
      interest_rate: mortgageFormData.interest_rate ?? null,
      rate_type: mortgageFormData.rate_type || null,
      term_start: mortgageFormData.term_start || null,
      term_end: mortgageFormData.term_end || null,
      payment_amount: mortgageFormData.payment_amount ?? null,
      payment_frequency: mortgageFormData.payment_frequency || "monthly",
    };
    if (mortgage) {
      await supabase.from("mortgages").update(payload).eq("id", mortgage.id);
    } else {
      await supabase.from("mortgages").insert(payload);
    }
    setShowMortgageForm(false);
    reloadMortgage();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Loading...</div>;
  }

  if (!property) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Property not found.</div>;
  }

  const monthlyObs = obligations.filter(o => o.frequency === "monthly");
  const totalMonthly = monthlyObs.reduce((s, o) => s + (o.amount || 0), 0);
  const totalRent = units.filter(u => u.is_rented).reduce((s, u) => s + (u.current_rent || 0), 0);
  const rentedUnits = units.filter(u => u.is_rented).length;
  const vacantUnits = units.filter(u => !u.is_rented).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link href="/properties" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
        <ArrowLeft size={14} /> Back to properties
      </Link>

      {/* Header */}
      {editingProperty ? (
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Edit Property Details</h2>
            <button onClick={() => setEditingProperty(false)} className="text-text-muted hover:text-text-primary">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={saveProperty} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-text-muted mb-1">Property Name</label>
              <input
                required
                value={propEditData.name || ""}
                onChange={e => setPropEditData(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-text-muted mb-1">Address</label>
              <input
                required
                value={propEditData.address || ""}
                onChange={e => setPropEditData(p => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">City</label>
              <input
                required
                value={propEditData.city || ""}
                onChange={e => setPropEditData(p => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Province</label>
              <input
                required
                value={propEditData.province || ""}
                onChange={e => setPropEditData(p => ({ ...p, province: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Postal Code</label>
              <input
                value={propEditData.postal_code || ""}
                onChange={e => setPropEditData(p => ({ ...p, postal_code: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Type</label>
              <select
                value={propEditData.property_type || "primary_residence"}
                onChange={e => setPropEditData(p => ({ ...p, property_type: e.target.value as Property["property_type"] }))}
              >
                <option value="primary_residence">Primary Residence</option>
                <option value="rental">Rental</option>
                <option value="vacation">Vacation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Strata?</label>
              <select
                value={propEditData.is_strata ? "true" : "false"}
                onChange={e => setPropEditData(p => ({ ...p, is_strata: e.target.value === "true" }))}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            {propEditData.is_strata && (
              <div>
                <label className="block text-xs text-text-muted mb-1">Strata Plan</label>
                <input
                  value={propEditData.strata_plan || ""}
                  onChange={e => setPropEditData(p => ({ ...p, strata_plan: e.target.value }))}
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-text-muted mb-1">Purchase Price</label>
              <input
                type="number"
                value={propEditData.purchase_price ?? ""}
                onChange={e => setPropEditData(p => ({ ...p, purchase_price: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Current Value</label>
              <input
                type="number"
                value={propEditData.current_value ?? ""}
                onChange={e => setPropEditData(p => ({ ...p, current_value: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Bedrooms</label>
              <input
                type="number"
                value={propEditData.bedrooms ?? ""}
                onChange={e => setPropEditData(p => ({ ...p, bedrooms: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Bathrooms</label>
              <input
                type="number"
                step="0.5"
                value={propEditData.bathrooms ?? ""}
                onChange={e => setPropEditData(p => ({ ...p, bathrooms: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setEditingProperty(false)} className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-bg-card-hover transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : (
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
            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1 rounded-full ${
                property.property_type === "primary_residence" ? "bg-accent-blue/15 text-accent-blue" : "bg-accent-green/15 text-accent-green"
              }`}>
                {propertyTypeLabel(property.property_type)}
              </span>
              <button
                onClick={startEditProperty}
                className="p-1.5 rounded-lg border border-border text-text-muted hover:text-accent-blue hover:border-accent-blue/40 transition-colors"
                title="Edit property"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
            <div>
              <p className="text-xs text-text-muted">Current Value</p>
              <p className="text-lg font-bold">{formatCurrency(property.current_value)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Units</p>
              <p className="text-lg font-bold">{units.length} <span className="text-sm font-normal text-text-muted">({rentedUnits} rented{vacantUnits > 0 ? `, ${vacantUnits} vacant` : ""})</span></p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Monthly Rent</p>
              <p className="text-lg font-bold text-accent-green">{formatCurrency(totalRent)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Monthly Costs</p>
              <p className="text-lg font-bold text-accent-red">{formatCurrency(totalMonthly)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Net Monthly</p>
              <p className={`text-lg font-bold ${totalRent - totalMonthly >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                {formatCurrency(totalRent - totalMonthly)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Purchase Price</p>
              <p className="text-lg font-bold">{formatCurrency(property.purchase_price)}</p>
            </div>
          </div>

          {property.is_strata && property.strata_plan && (
            <p className="text-xs text-text-muted mt-3">Strata Plan: {property.strata_plan}</p>
          )}
        </div>
      )}

      {/* Units */}
      <div className="bg-bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Home size={18} className="text-accent-purple" />
            Units ({units.length})
          </h2>
          <button onClick={() => setShowUnitForm(true)} className="text-xs text-accent-blue hover:underline flex items-center gap-1">
            <Plus size={14} /> Add Unit
          </button>
        </div>

        {showUnitForm && (
          <div className="p-5 border-b border-border">
            <form onSubmit={addUnit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Unit Name</label>
                  <input name="name" required placeholder="e.g. Main Unit, Basement Suite" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Rented?</label>
                  <select name="is_rented">
                    <option value="true">Yes - Rented</option>
                    <option value="false">No - Vacant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Current Rent</label>
                  <input name="current_rent" type="number" step="0.01" placeholder="2000" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Tenant Name</label>
                  <input name="tenant_name" placeholder="Tenant name" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Tenant Email</label>
                  <input name="tenant_email" type="email" placeholder="tenant@email.com" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Tenant Phone</label>
                  <input name="tenant_phone" placeholder="604-555-0123" />
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
                  <label className="block text-xs text-text-muted mb-1">Notes</label>
                  <input name="notes" placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowUnitForm(false)} className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs bg-accent-blue text-white rounded-lg">Add Unit</button>
              </div>
            </form>
          </div>
        )}

        <div className="divide-y divide-border">
          {units.length === 0 ? (
            <div className="p-6 text-center text-text-muted text-sm">No units added yet. Add units to track occupancy and rent.</div>
          ) : (
            units.map(unit => {
              if (editingUnitId === unit.id) {
                return (
                  <div key={unit.id} className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Unit Name</label>
                        <input value={unitEditData.name || ""} onChange={e => setUnitEditData({...unitEditData, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Rented?</label>
                        <select value={unitEditData.is_rented ? "true" : "false"} onChange={e => setUnitEditData({...unitEditData, is_rented: e.target.value === "true"})}>
                          <option value="true">Yes - Rented</option>
                          <option value="false">No - Vacant</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Current Rent</label>
                        <input type="number" step="0.01" value={unitEditData.current_rent || ""} onChange={e => setUnitEditData({...unitEditData, current_rent: e.target.value ? Number(e.target.value) : null})} />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Tenant Name</label>
                        <input value={unitEditData.tenant_name || ""} onChange={e => setUnitEditData({...unitEditData, tenant_name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Tenant Email</label>
                        <input type="email" value={unitEditData.tenant_email || ""} onChange={e => setUnitEditData({...unitEditData, tenant_email: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Tenant Phone</label>
                        <input value={unitEditData.tenant_phone || ""} onChange={e => setUnitEditData({...unitEditData, tenant_phone: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Lease Start</label>
                        <input type="date" value={unitEditData.lease_start || ""} onChange={e => setUnitEditData({...unitEditData, lease_start: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Lease End</label>
                        <input type="date" value={unitEditData.lease_end || ""} onChange={e => setUnitEditData({...unitEditData, lease_end: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">Notes</label>
                        <input value={unitEditData.notes || ""} onChange={e => setUnitEditData({...unitEditData, notes: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <button onClick={() => setEditingUnitId(null)} className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg">Cancel</button>
                      <button onClick={() => updateUnit(unit.id)} className="px-3 py-1.5 text-xs bg-accent-blue text-white rounded-lg">Save</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={unit.id} className="flex items-center justify-between px-5 py-3 group hover:bg-bg-card-hover transition-colors">
                  <div className="flex items-center gap-3">
                    {unit.is_rented ? (
                      <CheckCircle2 size={16} className="text-accent-green shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-accent-red shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{unit.name}</p>
                      <p className="text-xs text-text-muted">
                        {unit.is_rented ? (
                          <>
                            {unit.tenant_name && <span>{unit.tenant_name}</span>}
                            {unit.lease_end ? ` -- Lease ends ${formatDate(unit.lease_end)}` : unit.lease_start ? " -- Month-to-month" : ""}
                          </>
                        ) : (
                          "Vacant"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {unit.is_rented && unit.current_rent ? (
                        <p className="text-sm font-semibold text-accent-green">{formatCurrency(unit.current_rent)}/mo</p>
                      ) : unit.is_rented ? (
                        <p className="text-xs text-text-muted">Rent TBD</p>
                      ) : (
                        <p className="text-xs text-accent-red">No income</p>
                      )}
                    </div>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button onClick={() => { setEditingUnitId(unit.id); setUnitEditData(unit); }} className="p-1 rounded hover:bg-bg-secondary text-text-muted hover:text-accent-blue">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteUnit(unit.id)} className="p-1 rounded hover:bg-bg-secondary text-text-muted hover:text-accent-red">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Obligations */}
        <div className="bg-bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <DollarSign size={18} className="text-accent-blue" />
              Obligations
            </h2>
            <button onClick={() => { setShowObForm(true); setEditingObId(null); }} className="text-xs text-accent-blue hover:underline flex items-center gap-1">
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

                if (editingObId === ob.id) {
                  return (
                    <div key={ob.id} className="p-4 border-b border-border">
                      <form onSubmit={saveObligation} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Name</label>
                            <input
                              required
                              value={obEditData.name || ""}
                              onChange={e => setObEditData(d => ({ ...d, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Category</label>
                            <select
                              value={obEditData.category || "other"}
                              onChange={e => setObEditData(d => ({ ...d, category: e.target.value }))}
                            >
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
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={obEditData.amount ?? ""}
                              onChange={e => setObEditData(d => ({ ...d, amount: e.target.value ? Number(e.target.value) : null }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Frequency</label>
                            <select
                              value={obEditData.frequency || "monthly"}
                              onChange={e => setObEditData(d => ({ ...d, frequency: e.target.value }))}
                            >
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="semi_annual">Semi-Annual</option>
                              <option value="annual">Annual</option>
                              <option value="one_time">One-time</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Due Date</label>
                            <input
                              type="date"
                              value={obEditData.due_date || ""}
                              onChange={e => setObEditData(d => ({ ...d, due_date: e.target.value || null }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Provider</label>
                            <input
                              value={obEditData.provider || ""}
                              onChange={e => setObEditData(d => ({ ...d, provider: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Auto-pay?</label>
                            <select
                              value={obEditData.auto_pay ? "true" : "false"}
                              onChange={e => setObEditData(d => ({ ...d, auto_pay: e.target.value === "true" }))}
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingObId(null)} className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg">Cancel</button>
                          <button type="submit" className="px-3 py-1.5 text-xs bg-accent-blue text-white rounded-lg">Save</button>
                        </div>
                      </form>
                    </div>
                  );
                }

                return (
                  <div key={ob.id} className="flex items-center justify-between px-5 py-3 group">
                    <div>
                      <p className="text-sm font-medium">{ob.name}</p>
                      <p className="text-xs text-text-muted">
                        {categoryLabel(ob.category)} -- {ob.frequency}
                        {ob.auto_pay && <span className="ml-1 text-accent-green">Auto-pay</span>}
                        {ob.provider && <span className="ml-1">-- {ob.provider}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(ob.amount)}</p>
                        {ob.due_date && (
                          <p className={`text-xs ${urgencyColor(days)}`}>{formatDate(ob.due_date)}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditObligation(ob)}
                          className="p-1.5 rounded text-text-muted hover:text-accent-blue transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteObligation(ob.id)}
                          className="p-1.5 rounded text-text-muted hover:text-accent-red transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
              <button onClick={() => { setShowTenantForm(true); setEditingTenantId(null); }} className="text-xs text-accent-blue hover:underline flex items-center gap-1">
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
              tenants.map(t => {
                if (editingTenantId === t.id) {
                  return (
                    <div key={t.id} className="p-4">
                      <form onSubmit={saveTenant} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Name</label>
                            <input
                              required
                              value={tenantEditData.name || ""}
                              onChange={e => setTenantEditData(d => ({ ...d, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Email</label>
                            <input
                              type="email"
                              value={tenantEditData.email || ""}
                              onChange={e => setTenantEditData(d => ({ ...d, email: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Phone</label>
                            <input
                              value={tenantEditData.phone || ""}
                              onChange={e => setTenantEditData(d => ({ ...d, phone: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Monthly Rent</label>
                            <input
                              type="number"
                              value={tenantEditData.monthly_rent ?? ""}
                              onChange={e => setTenantEditData(d => ({ ...d, monthly_rent: e.target.value ? Number(e.target.value) : null }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Lease Start</label>
                            <input
                              type="date"
                              value={tenantEditData.lease_start || ""}
                              onChange={e => setTenantEditData(d => ({ ...d, lease_start: e.target.value || null }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Lease End</label>
                            <input
                              type="date"
                              value={tenantEditData.lease_end || ""}
                              onChange={e => setTenantEditData(d => ({ ...d, lease_end: e.target.value || null }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Security Deposit</label>
                            <input
                              type="number"
                              value={tenantEditData.security_deposit ?? ""}
                              onChange={e => setTenantEditData(d => ({ ...d, security_deposit: e.target.value ? Number(e.target.value) : null }))}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingTenantId(null)} className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg">Cancel</button>
                          <button type="submit" className="px-3 py-1.5 text-xs bg-accent-blue text-white rounded-lg">Save</button>
                        </div>
                      </form>
                    </div>
                  );
                }

                return (
                  <div key={t.id} className="px-5 py-3 group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-text-muted">
                          {t.email && <span>{t.email} </span>}
                          {t.phone && <span>-- {t.phone}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-accent-green">{formatCurrency(t.monthly_rent)}/mo</p>
                          <p className="text-xs text-text-muted">
                            {t.lease_start && formatDate(t.lease_start)}
                            {t.lease_end ? ` to ${formatDate(t.lease_end)}` : " -- Month-to-month"}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditTenant(t)}
                            className="p-1.5 rounded text-text-muted hover:text-accent-blue transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteTenant(t.id)}
                            className="p-1.5 rounded text-text-muted hover:text-accent-red transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Mortgage */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Mortgage Details</h2>
          <button
            onClick={startMortgageForm}
            className="text-xs text-accent-blue hover:underline flex items-center gap-1"
          >
            {mortgage ? <><Pencil size={13} /> Edit</> : <><Plus size={13} /> Add Mortgage</>}
          </button>
        </div>

        {showMortgageForm && (
          <form onSubmit={saveMortgage} className="space-y-4 mb-4 pb-4 border-b border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">Lender</label>
                <input
                  required
                  placeholder="e.g. TD Bank"
                  value={mortgageFormData.lender || ""}
                  onChange={e => setMortgageFormData(d => ({ ...d, lender: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Rate Type</label>
                <select
                  value={mortgageFormData.rate_type || "fixed"}
                  onChange={e => setMortgageFormData(d => ({ ...d, rate_type: e.target.value as Mortgage["rate_type"] }))}
                >
                  <option value="fixed">Fixed</option>
                  <option value="variable">Variable</option>
                  <option value="adjustable">Adjustable</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Original Amount</label>
                <input
                  type="number"
                  placeholder="500000"
                  value={mortgageFormData.original_amount ?? ""}
                  onChange={e => setMortgageFormData(d => ({ ...d, original_amount: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Current Balance</label>
                <input
                  type="number"
                  placeholder="480000"
                  value={mortgageFormData.current_balance ?? ""}
                  onChange={e => setMortgageFormData(d => ({ ...d, current_balance: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="5.25"
                  value={mortgageFormData.interest_rate ?? ""}
                  onChange={e => setMortgageFormData(d => ({ ...d, interest_rate: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Payment Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="2800"
                  value={mortgageFormData.payment_amount ?? ""}
                  onChange={e => setMortgageFormData(d => ({ ...d, payment_amount: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Payment Frequency</label>
                <select
                  value={mortgageFormData.payment_frequency || "monthly"}
                  onChange={e => setMortgageFormData(d => ({ ...d, payment_frequency: e.target.value }))}
                >
                  <option value="monthly">Monthly</option>
                  <option value="bi_weekly">Bi-Weekly</option>
                  <option value="weekly">Weekly</option>
                  <option value="accelerated_bi_weekly">Accelerated Bi-Weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Term Start</label>
                <input
                  type="date"
                  value={mortgageFormData.term_start || ""}
                  onChange={e => setMortgageFormData(d => ({ ...d, term_start: e.target.value || null }))}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Term End (Renewal)</label>
                <input
                  type="date"
                  value={mortgageFormData.term_end || ""}
                  onChange={e => setMortgageFormData(d => ({ ...d, term_end: e.target.value || null }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowMortgageForm(false)} className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded-lg">Cancel</button>
              <button type="submit" className="px-3 py-1.5 text-xs bg-accent-blue text-white rounded-lg">
                {mortgage ? "Save Changes" : "Add Mortgage"}
              </button>
            </div>
          </form>
        )}

        {mortgage && !showMortgageForm ? (
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
        ) : !mortgage && !showMortgageForm ? (
          <p className="text-sm text-text-muted">No mortgage on record. Click &quot;Add Mortgage&quot; to add one.</p>
        ) : null}
      </div>

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
