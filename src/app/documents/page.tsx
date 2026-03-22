"use client";

import { useEffect, useState } from "react";
import { supabase, type Property, type Document } from "@/lib/supabase";
import { formatDate, categoryLabel } from "@/lib/format";
import { FileText, ExternalLink, Image, File } from "lucide-react";
import Link from "next/link";

export default function DocumentsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const [propRes, docRes] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("documents").select("*").order("date", { ascending: false }),
      ]);
      setProperties(propRes.data || []);
      setDocuments(docRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = documents.filter(doc => {
    if (propertyFilter !== "all" && doc.property_id !== propertyFilter) return false;
    if (categoryFilter !== "all" && doc.category !== categoryFilter) return false;
    return true;
  });

  const categories = [...new Set(documents.map(d => d.category).filter(Boolean))];

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-text-muted text-sm mt-1">{documents.length} documents on file</p>
        </div>
        <Link href="/upload" className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
          Upload New
        </Link>
      </div>

      <div className="flex gap-3">
        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)} className="w-auto">
          <option value="all">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-auto">
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c!}>{categoryLabel(c!)}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <FileText size={48} className="mx-auto mb-4 text-text-muted" />
          <h3 className="font-semibold text-lg mb-2">No documents yet</h3>
          <p className="text-text-muted text-sm">Upload or email documents to start building your archive.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const prop = properties.find(p => p.id === doc.property_id);
            const isImage = doc.file_type?.startsWith("image");
            return (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-bg-card border border-border rounded-xl p-4 hover:bg-bg-card-hover transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isImage ? "bg-accent-blue/15 text-accent-blue" : "bg-accent-orange/15 text-accent-orange"
                  }`}>
                    {isImage ? <Image size={20} /> : <File size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">{prop?.name || "Unassigned"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {doc.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary">
                          {categoryLabel(doc.category)}
                        </span>
                      )}
                      <span className="text-xs text-text-muted">{formatDate(doc.date)}</span>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-text-muted mt-1 shrink-0" />
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
