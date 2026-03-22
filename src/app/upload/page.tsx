"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, type Property } from "@/lib/supabase";
import { Upload, FileText, CheckCircle2, X, Image } from "lucide-react";

export default function UploadPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState("receipt");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    supabase.from("properties").select("*").then(({ data }) => {
      setProperties(data || []);
      if (data && data.length > 0) setPropertyId(data[0].id);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  async function handleUpload() {
    if (files.length === 0 || !propertyId) return;
    setUploading(true);

    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${propertyId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("property-docs")
        .upload(path, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("property-docs")
        .getPublicUrl(path);

      await supabase.from("documents").insert({
        property_id: propertyId,
        category,
        name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type || ext,
        date: new Date().toISOString().split("T")[0],
      });

      setUploaded(prev => [...prev, file.name]);
    }

    setFiles([]);
    setUploading(false);
    setTimeout(() => setUploaded([]), 3000);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Documents</h1>
        <p className="text-text-muted text-sm mt-1">
          Photos of bills, receipts, assessments, notices -- anything property-related
        </p>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">Property</label>
            <select value={propertyId} onChange={e => setPropertyId(e.target.value)}>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="tax_notice">Tax Notice</option>
              <option value="assessment">Assessment</option>
              <option value="insurance">Insurance</option>
              <option value="strata">Strata</option>
              <option value="lease">Lease</option>
              <option value="receipt">Receipt</option>
              <option value="invoice">Invoice</option>
              <option value="correspondence">Correspondence</option>
              <option value="maintenance">Maintenance</option>
              <option value="inspection">Inspection</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            dragOver ? "border-accent-blue bg-accent-blue/5" : "border-border hover:border-text-muted"
          }`}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <Upload size={32} className="mx-auto mb-3 text-text-muted" />
          <p className="text-sm font-medium">Drop files here or click to browse</p>
          <p className="text-xs text-text-muted mt-1">Photos, PDFs, documents -- any format</p>
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between bg-bg-secondary rounded-lg px-4 py-2">
                <div className="flex items-center gap-3">
                  {file.type.startsWith("image/") ? (
                    <Image size={16} className="text-accent-blue" />
                  ) : (
                    <FileText size={16} className="text-accent-orange" />
                  )}
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-text-muted">{(file.size / 1024).toFixed(0)} KB</span>
                </div>
                <button onClick={() => removeFile(i)} className="text-text-muted hover:text-accent-red">
                  <X size={16} />
                </button>
              </div>
            ))}

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full mt-3 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading..." : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {uploaded.length > 0 && (
          <div className="bg-accent-green/10 border border-accent-green/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-accent-green">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">Uploaded successfully</span>
            </div>
            <ul className="mt-2 space-y-1">
              {uploaded.map((name, i) => (
                <li key={i} className="text-xs text-text-secondary">{name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-2">Email Intake</h2>
        <p className="text-sm text-text-secondary">
          You can also email photos and documents to your intake address.
          They&apos;ll be automatically categorized and filed to the right property.
        </p>
        <div className="mt-3 bg-bg-secondary rounded-lg px-4 py-3 font-mono text-sm text-accent-blue">
          property@getflowmortgage.ca
        </div>
        <p className="text-xs text-text-muted mt-2">
          Include the property name or address in the subject line for auto-routing.
        </p>
      </div>
    </div>
  );
}
