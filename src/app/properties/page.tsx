"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase, type Property } from "@/lib/supabase";
import { formatCurrency, propertyTypeLabel } from "@/lib/format";
import { Building2, Plus, MapPin, X, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

type PropertyFormData = {
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  property_type: string;
  is_strata: boolean;
  purchase_price: number | null;
  current_value: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
};

const emptyForm: PropertyFormData = {
  name: "",
  address: "",
  city: "",
  province: "BC",
  postal_code: "",
  property_type: "primary_residence",
  is_strata: false,
  purchase_price: null,
  current_value: null,
  bedrooms: null,
  bathrooms: null,
};

function propertyToForm(prop: Property): PropertyFormData {
  return {
    name: prop.name,
    address: prop.address,
    city: prop.city,
    province: prop.province,
    postal_code: prop.postal_code || "",
    property_type: prop.property_type,
    is_strata: prop.is_strata,
    purchase_price: prop.purchase_price,
    current_value: prop.current_value,
    bedrooms: prop.bedrooms,
    bathrooms: prop.bathrooms,
  };
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>(emptyForm);

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    const { data } = await supabase.from("properties").select("*").order("created_at");
    setProperties(data || []);
    setLoading(false);
  }

  function openAddForm() {
    setFormData({ ...emptyForm, city: "Kelowna" });
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(prop: Property, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFormData(propertyToForm(prop));
    setEditingId(prop.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      province: formData.province,
      postal_code: formData.postal_code || null,
      property_type: formData.property_type,
      is_strata: formData.is_strata,
      purchase_price: formData.purchase_price,
      current_value: formData.current_value,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
    };

    if (editingId) {
      await supabase.from("properties").update(payload).eq("id", editingId);
    } else {
      await supabase.from("properties").insert(payload);
    }

    closeForm();
    loadProperties();
  }

  async function deleteProperty(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this property? This cannot be undone.")) return;
    await supabase.from("properties").delete().eq("id", id);
    loadProperties();
  }

  function updateField<K extends keyof PropertyFormData>(key: K, value: PropertyFormData[K]) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-text-muted text-sm mt-1">{properties.length} properties in portfolio</p>
        </div>
        <button onClick={openAddForm} className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
          <Plus size={16} /> Add Property
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{editingId ? "Edit Property" : "Add Property"}</h2>
            <button onClick={closeForm} className="text-text-muted hover:text-text-primary">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-text-muted mb-1">Property Name</label>
              <input
                name="name"
                required
                placeholder="e.g. Main Residence or Rental - Oak St"
                value={formData.name}
                onChange={e => updateField("name", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-text-muted mb-1">Address</label>
              <input
                name="address"
                required
                placeholder="123 Main Street"
                value={formData.address}
                onChange={e => updateField("address", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">City</label>
              <input
                name="city"
                required
                value={formData.city}
                onChange={e => updateField("city", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Province</label>
              <input
                name="province"
                required
                value={formData.province}
                onChange={e => updateField("province", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Postal Code</label>
              <input
                name="postal_code"
                placeholder="V1Y 1A1"
                value={formData.postal_code}
                onChange={e => updateField("postal_code", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Type</label>
              <select
                name="property_type"
                required
                value={formData.property_type}
                onChange={e => updateField("property_type", e.target.value)}
              >
                <option value="primary_residence">Primary Residence</option>
                <option value="rental">Rental</option>
                <option value="vacation">Vacation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Strata?</label>
              <select
                name="is_strata"
                value={formData.is_strata ? "true" : "false"}
                onChange={e => updateField("is_strata", e.target.value === "true")}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Purchase Price</label>
              <input
                name="purchase_price"
                type="number"
                placeholder="500000"
                value={formData.purchase_price ?? ""}
                onChange={e => updateField("purchase_price", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Current Value</label>
              <input
                name="current_value"
                type="number"
                placeholder="600000"
                value={formData.current_value ?? ""}
                onChange={e => updateField("current_value", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Bedrooms</label>
              <input
                name="bedrooms"
                type="number"
                placeholder="3"
                value={formData.bedrooms ?? ""}
                onChange={e => updateField("bedrooms", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Bathrooms</label>
              <input
                name="bathrooms"
                type="number"
                step="0.5"
                placeholder="2"
                value={formData.bathrooms ?? ""}
                onChange={e => updateField("bathrooms", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-bg-card-hover transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                {editingId ? "Save Changes" : "Add Property"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {properties.map(prop => (
          <div key={prop.id} className="relative group">
            <Link
              href={`/properties/${prop.id}`}
              className="block bg-bg-card border border-border rounded-xl p-5 hover:bg-bg-card-hover transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-purple/15 flex items-center justify-center text-accent-purple">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{prop.name}</h3>
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {prop.address}, {prop.city}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  prop.property_type === "primary_residence" ? "bg-accent-blue/15 text-accent-blue" :
                  "bg-accent-green/15 text-accent-green"
                }`}>
                  {propertyTypeLabel(prop.property_type)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs text-text-muted">Value</p>
                  <p className="text-sm font-semibold mt-0.5">{formatCurrency(prop.current_value)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Purchase</p>
                  <p className="text-sm font-semibold mt-0.5">{formatCurrency(prop.purchase_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Strata</p>
                  <p className="text-sm font-semibold mt-0.5">{prop.is_strata ? "Yes" : "No"}</p>
                </div>
              </div>
            </Link>
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => openEditForm(prop, e)}
                className="p-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-accent-blue hover:border-accent-blue/40 transition-colors"
                title="Edit property"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={e => deleteProperty(prop.id, e)}
                className="p-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-accent-red hover:border-accent-red/40 transition-colors"
                title="Delete property"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {properties.length === 0 && !showForm && (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-text-muted" />
          <h3 className="font-semibold text-lg mb-2">No properties yet</h3>
          <p className="text-text-muted text-sm mb-4">Add your properties and I&apos;ll start managing everything for you.</p>
          <button onClick={openAddForm} className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
            <Plus size={16} /> Add Your First Property
          </button>
        </div>
      )}
    </div>
  );
}
