"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase, type Property, type Tenant } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";
import { Users, Mail, Phone, Calendar, FileText, X, Copy, Check } from "lucide-react";

type TenantWithProperty = Tenant & { property: Property };

type DraftEmail = {
  to: string;
  subject: string;
  body: string;
};

type CommunicationLog = {
  type: "call" | "text" | "in_person";
  date: string;
  notes: string;
};

type RTBNoticeType = "rtb7" | "rent_increase";

function generateRTB7(tenant: TenantWithProperty): string {
  const today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `BC RESIDENTIAL TENANCY BRANCH
FORM RTB-7: 10 DAY NOTICE TO END TENANCY FOR UNPAID RENT OR UTILITIES

Date of Notice: ${today}

TO: ${tenant.name}
    ${tenant.property.address}, ${tenant.property.city}, ${tenant.property.province} ${tenant.property.postal_code || ""}

FROM: Landlord / Authorized Agent
      Alex McFadyen
      alex@getflowmortgage.ca

This is a notice to end your tenancy at the above address.

REASON FOR NOTICE:
You have not paid rent that was due. The total unpaid amount is:

Monthly Rent: ${formatCurrency(tenant.monthly_rent)}
Amount Owing: ${formatCurrency(tenant.monthly_rent)}

YOU HAVE 5 DAYS from the date you receive this notice to pay the full amount owed OR dispute
this notice by applying to the Residential Tenancy Branch.

If you do not pay the full amount owed or dispute this notice within 5 days, your tenancy will
end on: ${tenDaysFromNow}

You must move out by 1:00 PM on the date your tenancy ends.

To pay the amount owed or for more information, contact the landlord at:
alex@getflowmortgage.ca

To dispute this notice, apply to the Residential Tenancy Branch online at:
www.gov.bc.ca/landlordtenant or call 1-800-665-8779.

---
Landlord Signature: _______________________     Date: ${today}

NOTE: This notice must be served in accordance with the Residential Tenancy Act.
The landlord must give a copy of this notice to the tenant.
This form is for informational purposes. Use the official RTB-7 form from the BC
Residential Tenancy Branch website: www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies`;
}

function generateRentIncreaseNotice(tenant: TenantWithProperty): string {
  const today = new Date();
  const effectiveDate = new Date(today);
  effectiveDate.setMonth(effectiveDate.getMonth() + 3);
  const effectiveDateStr = effectiveDate.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const todayStr = today.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  const currentRent = tenant.monthly_rent || 0;
  const increaseRate = 3.0; // 2026 BC maximum allowable increase
  const increaseAmount = Math.round(currentRent * (increaseRate / 100) * 100) / 100;
  const newRent = currentRent + increaseAmount;

  return `BC RESIDENTIAL TENANCY BRANCH
RENT INCREASE NOTICE

Date of Notice: ${todayStr}

TO: ${tenant.name}
    ${tenant.property.address}, ${tenant.property.city}, ${tenant.property.province} ${tenant.property.postal_code || ""}

FROM: Landlord / Authorized Agent
      Alex McFadyen
      alex@getflowmortgage.ca

NOTICE OF RENT INCREASE

This letter is to provide you with the required 3 months' notice that your monthly rent will
increase as of ${effectiveDateStr}.

Current Monthly Rent:    ${formatCurrency(currentRent)}
Increase Amount (${increaseRate}%):  ${formatCurrency(increaseAmount)}
New Monthly Rent:        ${formatCurrency(newRent)}

This increase is in accordance with the British Columbia Residential Tenancy Act and the
maximum allowable rent increase for 2026 as set by the Residential Tenancy Branch.

The maximum allowable increase for 2026 is 3.0%, based on the BC CPI calculation.

The new monthly rent of ${formatCurrency(newRent)} will be due on the first day of each month,
beginning ${effectiveDateStr}.

If you have any questions or concerns regarding this notice, please contact:
alex@getflowmortgage.ca

For more information on rent increases in BC, visit:
www.gov.bc.ca/landlordtenant or call 1-800-665-8779.

---
Landlord Signature: _______________________     Date: ${todayStr}

NOTE: This notice is required to be served at least 3 full months before the effective date.
The landlord must give a copy of this notice to the tenant.
Rent cannot be increased more than once in a 12-month period.`;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantWithProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const [draftModal, setDraftModal] = useState<{ tenant: TenantWithProperty; draft: DraftEmail } | null>(null);
  const [commModal, setCommModal] = useState<{ tenant: TenantWithProperty; log: CommunicationLog } | null>(null);
  const [rtbModal, setRtbModal] = useState<{
    tenant: TenantWithProperty;
    type: RTBNoticeType;
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedComms, setSavedComms] = useState<Record<string, CommunicationLog[]>>({});
  const [draftEmails, setDraftEmails] = useState<Record<string, DraftEmail[]>>({});

  useEffect(() => {
    async function load() {
      const [propRes, tenantRes] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("tenants").select("*").eq("is_active", true).order("name"),
      ]);

      const properties = propRes.data || [];
      const rawTenants = tenantRes.data || [];

      const enriched: TenantWithProperty[] = rawTenants
        .map((t) => {
          const property = properties.find((p) => p.id === t.property_id);
          if (!property) return null;
          return { ...t, property };
        })
        .filter(Boolean) as TenantWithProperty[];

      setTenants(enriched);
      setLoading(false);
    }
    load();
  }, []);

  function openDraftEmail(tenant: TenantWithProperty) {
    setDraftModal({
      tenant,
      draft: {
        to: tenant.email || "",
        subject: `Re: ${tenant.property.address}`,
        body: `Hi ${tenant.name.split(" ")[0]},\n\n\n\nBest regards,\nAlex McFadyen`,
      },
    });
  }

  function saveDraft() {
    if (!draftModal) return;
    const { tenant, draft } = draftModal;
    setDraftEmails((prev) => ({
      ...prev,
      [tenant.id]: [...(prev[tenant.id] || []), { ...draft }],
    }));
    setDraftModal(null);
  }

  function openCommLog(tenant: TenantWithProperty) {
    setCommModal({
      tenant,
      log: {
        type: "call",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      },
    });
  }

  function saveComm() {
    if (!commModal) return;
    const { tenant, log } = commModal;
    setSavedComms((prev) => ({
      ...prev,
      [tenant.id]: [...(prev[tenant.id] || []), { ...log }],
    }));
    setCommModal(null);
  }

  function openRTBNotice(tenant: TenantWithProperty, type: RTBNoticeType) {
    const text = type === "rtb7" ? generateRTB7(tenant) : generateRentIncreaseNotice(tenant);
    setRtbModal({ tenant, type, text });
    setCopied(false);
  }

  function copyNotice() {
    if (!rtbModal) return;
    navigator.clipboard.writeText(rtbModal.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function printNotice() {
    if (!rtbModal) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${rtbModal.type === "rtb7" ? "RTB-7 Notice" : "Rent Increase Notice"} - ${rtbModal.tenant.name}</title>
  <style>
    body { font-family: monospace; font-size: 13px; line-height: 1.6; margin: 40px; color: #000; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
<pre>${rtbModal.text}</pre>
</body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  const commTypeLabel = (t: string) =>
    ({ call: "Phone Call", text: "Text Message", in_person: "In Person" })[t] || t;

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tenants</h1>
        <p className="text-text-muted text-sm mt-1">
          {tenants.length} active tenant{tenants.length !== 1 ? "s" : ""} across all properties
        </p>
      </div>

      {tenants.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
          <Users size={48} className="mx-auto mb-4 text-text-muted" />
          <h3 className="font-semibold text-lg mb-2">No active tenants</h3>
          <p className="text-text-muted text-sm">Add tenants to your properties to manage them here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => {
            const tenantComms = savedComms[tenant.id] || [];
            const tenantDrafts = draftEmails[tenant.id] || [];

            return (
              <div key={tenant.id} className="bg-bg-card border border-border rounded-xl p-5">
                {/* Tenant Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-blue/15 flex items-center justify-center text-accent-blue font-semibold text-sm">
                      {tenant.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{tenant.name}</h3>
                      <p className="text-xs text-text-muted">{tenant.property.name}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green/15 text-accent-green">
                    Active
                  </span>
                </div>

                {/* Tenant Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <Mail size={11} /> Email
                    </p>
                    <p className="text-sm mt-0.5 truncate">{tenant.email || "--"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <Phone size={11} /> Phone
                    </p>
                    <p className="text-sm mt-0.5">{tenant.phone || "--"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Monthly Rent</p>
                    <p className="text-sm font-semibold mt-0.5 text-accent-green">
                      {formatCurrency(tenant.monthly_rent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <Calendar size={11} /> Lease
                    </p>
                    <p className="text-sm mt-0.5">
                      {formatDate(tenant.lease_start)} - {formatDate(tenant.lease_end)}
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div className="mb-4 text-xs text-text-muted">
                  {tenant.property.address}, {tenant.property.city}, {tenant.property.province}{" "}
                  {tenant.property.postal_code}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => openDraftEmail(tenant)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-blue/10 text-accent-blue border border-accent-blue/20 rounded-lg hover:bg-accent-blue/20 transition-colors"
                  >
                    <Mail size={13} /> Draft Email
                  </button>
                  <button
                    onClick={() => openCommLog(tenant)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-bg-secondary text-text-secondary border border-border rounded-lg hover:text-text-primary hover:bg-bg-card-hover transition-colors"
                  >
                    <Phone size={13} /> Log Communication
                  </button>
                  <button
                    onClick={() => openRTBNotice(tenant, "rent_increase")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-orange/10 text-accent-orange border border-accent-orange/20 rounded-lg hover:bg-accent-orange/20 transition-colors"
                  >
                    <FileText size={13} /> Rent Increase Notice
                  </button>
                  <button
                    onClick={() => openRTBNotice(tenant, "rtb7")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-red/10 text-accent-red border border-accent-red/20 rounded-lg hover:bg-accent-red/20 transition-colors"
                  >
                    <FileText size={13} /> Draft RTB-7 (10 Day Notice)
                  </button>
                </div>

                {/* Saved Draft Emails */}
                {tenantDrafts.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-text-muted mb-2 font-medium">Drafted Emails ({tenantDrafts.length})</p>
                    <div className="space-y-2">
                      {tenantDrafts.map((d, i) => (
                        <div key={i} className="bg-bg-secondary rounded-lg p-3 text-xs">
                          <p className="font-medium text-text-secondary">
                            To: {d.to} — {d.subject}
                          </p>
                          <p className="text-text-muted mt-1 line-clamp-2 whitespace-pre-wrap">{d.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Saved Communication Logs */}
                {tenantComms.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-text-muted mb-2 font-medium">
                      Communication Log ({tenantComms.length})
                    </p>
                    <div className="space-y-2">
                      {tenantComms.map((c, i) => (
                        <div key={i} className="bg-bg-secondary rounded-lg p-3 text-xs">
                          <p className="font-medium text-text-secondary">
                            {commTypeLabel(c.type)} — {formatDate(c.date)}
                          </p>
                          <p className="text-text-muted mt-1">{c.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Draft Email Modal */}
      {draftModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold">Draft Email to {draftModal.tenant.name}</h2>
              <button onClick={() => setDraftModal(null)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">To</label>
                <input
                  value={draftModal.draft.to}
                  onChange={(e) =>
                    setDraftModal((prev) => prev && { ...prev, draft: { ...prev.draft, to: e.target.value } })
                  }
                  placeholder="tenant@email.com"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Subject</label>
                <input
                  value={draftModal.draft.subject}
                  onChange={(e) =>
                    setDraftModal((prev) => prev && { ...prev, draft: { ...prev.draft, subject: e.target.value } })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Body</label>
                <textarea
                  rows={8}
                  value={draftModal.draft.body}
                  onChange={(e) =>
                    setDraftModal((prev) => prev && { ...prev, draft: { ...prev.draft, body: e.target.value } })
                  }
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button
                onClick={() => setDraftModal(null)}
                className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-bg-card-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveDraft}
                className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Communication Log Modal */}
      {commModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold">Log Communication — {commModal.tenant.name}</h2>
              <button onClick={() => setCommModal(null)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">Type</label>
                <select
                  value={commModal.log.type}
                  onChange={(e) =>
                    setCommModal((prev) =>
                      prev && { ...prev, log: { ...prev.log, type: e.target.value as CommunicationLog["type"] } }
                    )
                  }
                >
                  <option value="call">Phone Call</option>
                  <option value="text">Text Message</option>
                  <option value="in_person">In Person</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Date</label>
                <input
                  type="date"
                  value={commModal.log.date}
                  onChange={(e) =>
                    setCommModal((prev) => prev && { ...prev, log: { ...prev.log, date: e.target.value } })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Notes</label>
                <textarea
                  rows={4}
                  placeholder="What was discussed..."
                  value={commModal.log.notes}
                  onChange={(e) =>
                    setCommModal((prev) => prev && { ...prev, log: { ...prev.log, notes: e.target.value } })
                  }
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button
                onClick={() => setCommModal(null)}
                className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-bg-card-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveComm}
                className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Save Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RTB Notice Modal */}
      {rtbModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <div>
                <h2 className="font-semibold">
                  {rtbModal.type === "rtb7" ? "RTB-7: 10 Day Notice" : "Rent Increase Notice"}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">{rtbModal.tenant.name}</p>
              </div>
              <button onClick={() => setRtbModal(null)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed bg-bg-secondary rounded-lg p-4 border border-border">
                {rtbModal.text}
              </pre>
              {rtbModal.type === "rtb7" && (
                <div className="mt-3 p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
                  <p className="text-xs text-accent-red font-medium">
                    Important: This is a draft for reference only. Use the official BC RTB-7 form from the Residential
                    Tenancy Branch website. Serve in accordance with the Residential Tenancy Act.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border flex-shrink-0">
              <button
                onClick={copyNotice}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-bg-card-hover transition-colors"
              >
                {copied ? <Check size={15} className="text-accent-green" /> : <Copy size={15} />}
                {copied ? "Copied!" : "Copy Text"}
              </button>
              <button
                onClick={printNotice}
                className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
