export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function priorityBadge(priority: string): string {
  const map: Record<string, string> = {
    urgent: "#ef4444",
    high: "#f97316",
    normal: "#eab308",
    low: "#64748b",
  };
  return map[priority] || map.normal;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in30DaysStr = in30Days.toISOString().split("T")[0];

  // Fetch pending alerts, properties, and upcoming obligations concurrently
  const [alertsRes, propertiesRes, obligationsRes] = await Promise.all([
    supabase
      .from("alerts")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("due_date", { ascending: true }),
    supabase.from("properties").select("id, name, address"),
    supabase
      .from("obligations")
      .select("*")
      .eq("is_active", true)
      .not("due_date", "is", null)
      .lte("due_date", in30DaysStr)
      .order("due_date", { ascending: true }),
  ]);

  const alerts = alertsRes.data || [];
  const properties = propertiesRes.data || [];
  const obligations = obligationsRes.data || [];

  // Build property lookup
  const propMap = Object.fromEntries(properties.map((p) => [p.id, p]));

  // Separate urgent/high from normal/low alerts
  const urgentAlerts = alerts.filter((a) => a.priority === "urgent" || a.priority === "high");
  const normalAlerts = alerts.filter((a) => a.priority === "normal" || a.priority === "low");

  // Build HTML email body
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Property Hub Digest</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0f1a; font-family: system-ui, -apple-system, sans-serif; color: #f1f5f9; }
    .container { max-width: 640px; margin: 0 auto; padding: 24px 16px; }
    .header { padding: 24px; background: #111827; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; }
    .header p { margin: 0; font-size: 13px; color: #64748b; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 12px; }
    .card { background: #1a2234; border: 1px solid #2a3548; border-radius: 10px; padding: 14px 16px; margin-bottom: 8px; }
    .card-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .card-title { font-size: 14px; font-weight: 600; margin: 0 0 2px; }
    .card-sub { font-size: 12px; color: #94a3b8; margin: 0; }
    .card-meta { font-size: 12px; color: #64748b; text-align: right; white-space: nowrap; }
    .badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .amount { font-size: 14px; font-weight: 700; color: #f1f5f9; }
    .overdue { color: #ef4444; }
    .soon { color: #f97316; }
    .ok { color: #22c55e; }
    .empty { text-align: center; padding: 24px; color: #64748b; font-size: 13px; }
    .footer { text-align: center; font-size: 11px; color: #374151; margin-top: 32px; }
    a { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Property Hub Digest</h1>
      <p>Generated ${now.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
    </div>

    ${urgentAlerts.length > 0 ? `
    <div class="section">
      <div class="section-title">Urgent / High Priority Alerts (${urgentAlerts.length})</div>
      ${urgentAlerts.map((alert) => {
        const color = priorityBadge(alert.priority);
        const prop = alert.property_id ? propMap[alert.property_id] : null;
        const days = daysUntil(alert.due_date);
        const daysText = days === null ? "" : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "due today" : `due in ${days}d`;
        return `
      <div class="card">
        <div class="card-row">
          <div>
            <p class="card-title">${alert.title}</p>
            ${alert.description ? `<p class="card-sub">${alert.description}</p>` : ""}
            ${prop ? `<p class="card-sub" style="margin-top:4px">${prop.name}</p>` : ""}
          </div>
          <div class="card-meta">
            <span class="badge" style="background:${color}22;color:${color}">${alert.priority}</span>
            ${daysText ? `<br/><span class="${days !== null && days < 0 ? "overdue" : days !== null && days <= 7 ? "soon" : "ok"}" style="font-size:11px">${daysText}</span>` : ""}
            ${alert.due_date ? `<br/><span>${formatDate(alert.due_date)}</span>` : ""}
          </div>
        </div>
      </div>`;
      }).join("")}
    </div>
    ` : ""}

    <div class="section">
      <div class="section-title">Upcoming Obligations — Next 30 Days (${obligations.length})</div>
      ${obligations.length === 0
        ? `<div class="empty">No upcoming obligations in the next 30 days.</div>`
        : obligations.map((ob) => {
            const prop = propMap[ob.property_id];
            const days = daysUntil(ob.due_date);
            const daysText = days === null ? "" : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "due today" : `in ${days}d`;
            const daysClass = days !== null && days < 0 ? "overdue" : days !== null && days <= 7 ? "soon" : "ok";
            return `
      <div class="card">
        <div class="card-row">
          <div>
            <p class="card-title">${ob.name}</p>
            <p class="card-sub">${prop?.name || "Unknown property"}${ob.provider ? ` · ${ob.provider}` : ""}</p>
          </div>
          <div class="card-meta">
            <span class="amount">${formatCurrency(ob.amount)}</span>
            <br/>
            <span class="${daysClass}" style="font-size:11px">${formatDate(ob.due_date)}${daysText ? ` (${daysText})` : ""}</span>
            ${ob.auto_pay ? `<br/><span style="color:#22c55e;font-size:10px">AUTO-PAY</span>` : `<br/><span style="color:#f97316;font-size:10px">MANUAL</span>`}
          </div>
        </div>
      </div>`;
          }).join("")}
    </div>

    ${normalAlerts.length > 0 ? `
    <div class="section">
      <div class="section-title">Other Pending Alerts (${normalAlerts.length})</div>
      ${normalAlerts.slice(0, 10).map((alert) => {
        const prop = alert.property_id ? propMap[alert.property_id] : null;
        return `
      <div class="card">
        <div class="card-row">
          <div>
            <p class="card-title">${alert.title}</p>
            ${prop ? `<p class="card-sub">${prop.name}</p>` : ""}
          </div>
          <div class="card-meta">
            ${alert.due_date ? `<span style="font-size:12px">${formatDate(alert.due_date)}</span>` : ""}
          </div>
        </div>
      </div>`;
      }).join("")}
    </div>
    ` : ""}

    ${urgentAlerts.length === 0 && obligations.length === 0 && normalAlerts.length === 0 ? `
    <div class="card">
      <div class="empty">All clear — no pending alerts or upcoming obligations.</div>
    </div>
    ` : ""}

    <div class="footer">
      Property Hub · McFadyen Portfolio · ${now.getFullYear()}
    </div>
  </div>
</body>
</html>`;

  return Response.json({
    generated_at: now.toISOString(),
    counts: {
      urgent_alerts: urgentAlerts.length,
      normal_alerts: normalAlerts.length,
      upcoming_obligations: obligations.length,
    },
    html,
  });
}
