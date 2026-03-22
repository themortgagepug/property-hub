"use client";

import { useEffect, useState } from "react";
import { supabase, type Property } from "@/lib/supabase";
import { formatCurrency, propertyTypeLabel } from "@/lib/format";
import { Building2, Plus, MapPin, X } from "lucide-react";
import Link from "next/link";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    const { data } = await supabase.from("properties").select("*").order("created_at");
    setProperties(data || []);
    setLoading(false);
  }

  async function addProperty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const property = {
      name: form.get("name") as string,
      address: form.get("address") as string,
      city: form.get("city") as string,
      province: form.get("province") as string,
      postal_code: form.get("postal_code") as string,
      property_type: form.get("property_type") as string,
      is_strata: form.get("is_strata") === "true",
      purchase_price: form.get("purchase_price") ? Number(form.get("purchase_price")) : null,
      current_value: form.get("current_value") ? Number(form.get("current_value")) : null,
      bedrooms: form.get("bedrooms") ? Number(form.get("bedrooms")) : null,
      bathrooms: form.get("bathrooms") ? Number(form.get("bathrooms")) : null,
    };
    await supabase.from("properties").insert(property);
    setShowForm(false);
    loadProperties();
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
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
          <Plus size={16} /> Add Property
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Add Property</h2>
            <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={addProperty} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-text-muted mb-1">Property Name</label>
              <input name="name" required placeholder="e.g. Main Residence or Rental - Oak St" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-text-muted mb-1">Address</label>
              <input name="address" required placeholder="123 Main Street" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">City</label>
              <input name="city" required defaultValue="Kelowna" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Province</label>
              <input name="province" required defaultValue="BC" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Postal Code</label>
              <input name="postal_code" placeholder="V1Y 1A1" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Type</label>
              <select name="property_type" required>
                <option value="primary_residence">Primary Residence</option>
                <option value="rental">Rental</option>
                <option value="vacation">Vacation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Strata?</label>
              <select name="is_strata">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Purchase Price</label>
              <input name="purchase_price" type="number" placeholder="500000" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Current Value</label>
              <input name="current_value" type="number" placeholder="600000" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Bedrooms</label>
              <input name="bedrooms" type="number" placeholder="3" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Bathrooms</label>
              <input name="bathrooms" type="number" step="0.5" placeholder="2" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-bg-card-hover transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                Add Property
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {properties.map(prop => (
          <Link
            key={prop.id}
            href={`/properties/${prop.id}`}
            className="bg-bg-card border border-border rounded-xl p-5 hover:bg-bg-card-hover transition-colors"
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
        ))}
      </div>

      {properties.length === 0 && !showForm && (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-text-muted" />
          <h3 className="font-semibold text-lg mb-2">No properties yet</h3>
          <p className="text-text-muted text-sm mb-4">Add your properties and I&apos;ll start managing everything for you.</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
            <Plus size={16} /> Add Your First Property
          </button>
        </div>
      )}
    </div>
  );
}
