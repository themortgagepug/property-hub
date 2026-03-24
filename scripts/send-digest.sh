#!/usr/bin/env bash
# Property Hub — Weekly Digest Email
# Fetches alerts + obligations from Supabase, builds HTML, sends via Resend
# Requires: RESEND_API_KEY env var

set -euo pipefail

SUPABASE_URL="https://jkeujqzlclrxhwamplby.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZXVqcXpsY2xyeGh3YW1wbGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDcyNzUsImV4cCI6MjA4MjE4MzI3NX0.Y2Bs9ur37qQ3dVdcy2XrVa-J5idbrENEPzCeeAn9ji4"
RESEND_KEY="${RESEND_API_KEY:?RESEND_API_KEY required}"
DIGEST_DATE=$(TZ="America/Vancouver" date +"%B %-d, %Y")
TODAY=$(TZ="America/Vancouver" date +"%Y-%m-%d")
THIRTY_DAYS=$(TZ="America/Vancouver" date -v+30d +"%Y-%m-%d" 2>/dev/null || date -d "+30 days" +"%Y-%m-%d")

echo "=== Property Hub Weekly Digest ==="
echo "Date: $DIGEST_DATE"

# Fetch pending alerts
echo "Fetching alerts..."
ALERTS=$(curl -sf \
  "$SUPABASE_URL/rest/v1/alerts?status=eq.pending&order=due_date.asc&select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY")

# Fetch upcoming obligations (next 30 days)
echo "Fetching obligations..."
OBLIGATIONS=$(curl -sf \
  "$SUPABASE_URL/rest/v1/obligations?is_active=eq.true&due_date=lte.$THIRTY_DAYS&due_date=gte.$TODAY&order=due_date.asc&select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY")

# Fetch properties for names
PROPERTIES=$(curl -sf \
  "$SUPABASE_URL/rest/v1/properties?select=id,name" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY")

# Count alerts by priority
URGENT_COUNT=$(echo "$ALERTS" | jq '[.[] | select(.priority == "urgent" or .priority == "high")] | length')
NORMAL_COUNT=$(echo "$ALERTS" | jq '[.[] | select(.priority == "normal" or .priority == "low")] | length')
OB_COUNT=$(echo "$OBLIGATIONS" | jq 'length')

echo "Urgent/High: $URGENT_COUNT | Normal: $NORMAL_COUNT | Obligations: $OB_COUNT"

# Build alert rows
ALERT_ROWS=""
for i in $(echo "$ALERTS" | jq -r 'range(length)'); do
  TITLE=$(echo "$ALERTS" | jq -r ".[$i].title")
  DESC=$(echo "$ALERTS" | jq -r ".[$i].description // \"\"" | head -c 120)
  DUE=$(echo "$ALERTS" | jq -r ".[$i].due_date // \"\"")
  PRIORITY=$(echo "$ALERTS" | jq -r ".[$i].priority")

  if [ "$PRIORITY" = "urgent" ]; then
    COLOR="#ef4444"
  elif [ "$PRIORITY" = "high" ]; then
    COLOR="#f97316"
  else
    COLOR="#3b82f6"
  fi

  ALERT_ROWS="${ALERT_ROWS}
  <tr>
    <td style='padding:10px 16px;border-bottom:1px solid #1e293b;'>
      <span style='display:inline-block;width:8px;height:8px;border-radius:50%;background:${COLOR};margin-right:8px;'></span>
      <strong style='color:#f1f5f9;font-size:14px;'>${TITLE}</strong>
      <div style='color:#94a3b8;font-size:12px;margin-top:4px;'>${DESC}</div>
    </td>
    <td style='padding:10px 16px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:12px;text-align:right;white-space:nowrap;'>${DUE}</td>
  </tr>"
done

# Build obligation rows
OB_ROWS=""
for i in $(echo "$OBLIGATIONS" | jq -r 'range(length)'); do
  NAME=$(echo "$OBLIGATIONS" | jq -r ".[$i].name")
  AMOUNT=$(echo "$OBLIGATIONS" | jq -r ".[$i].amount // \"--\"")
  DUE=$(echo "$OBLIGATIONS" | jq -r ".[$i].due_date // \"\"")
  PROP_ID=$(echo "$OBLIGATIONS" | jq -r ".[$i].property_id")
  PROP_NAME=$(echo "$PROPERTIES" | jq -r ".[] | select(.id == \"$PROP_ID\") | .name // \"Unknown\"")

  if [ "$AMOUNT" != "--" ] && [ "$AMOUNT" != "null" ]; then
    AMOUNT_DISPLAY="\$$(printf "%'.0f" "$AMOUNT" 2>/dev/null || echo "$AMOUNT")"
  else
    AMOUNT_DISPLAY="--"
  fi

  OB_ROWS="${OB_ROWS}
  <tr>
    <td style='padding:8px 16px;border-bottom:1px solid #1e293b;color:#f1f5f9;font-size:13px;'>${NAME}</td>
    <td style='padding:8px 16px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:12px;'>${PROP_NAME}</td>
    <td style='padding:8px 16px;border-bottom:1px solid #1e293b;color:#f1f5f9;font-size:13px;text-align:right;'>${AMOUNT_DISPLAY}</td>
    <td style='padding:8px 16px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:12px;text-align:right;'>${DUE}</td>
  </tr>"
done

# Build HTML email
HTML="<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#0a0f1a;'>
<tr><td align='center' style='padding:32px 16px;'>
<table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;'>

<!-- Header -->
<tr><td style='padding:24px;background:#111827;border-radius:12px 12px 0 0;border:1px solid #2a3548;border-bottom:none;'>
  <h1 style='margin:0;color:#f1f5f9;font-size:20px;font-weight:700;'>Property Hub</h1>
  <p style='margin:4px 0 0;color:#64748b;font-size:13px;'>Weekly Digest -- ${DIGEST_DATE}</p>
</td></tr>

<!-- Stats -->
<tr><td style='padding:0;background:#111827;border-left:1px solid #2a3548;border-right:1px solid #2a3548;'>
<table width='100%' cellpadding='0' cellspacing='0'>
<tr>
  <td style='padding:16px 24px;text-align:center;width:33%;'>
    <div style='font-size:24px;font-weight:700;color:${URGENT_COUNT:-0};'><span style='color:#f97316;'>${URGENT_COUNT}</span></div>
    <div style='font-size:11px;color:#64748b;margin-top:4px;'>URGENT ITEMS</div>
  </td>
  <td style='padding:16px 24px;text-align:center;width:33%;border-left:1px solid #2a3548;border-right:1px solid #2a3548;'>
    <div style='font-size:24px;font-weight:700;color:#3b82f6;'>${NORMAL_COUNT}</div>
    <div style='font-size:11px;color:#64748b;margin-top:4px;'>ALERTS</div>
  </td>
  <td style='padding:16px 24px;text-align:center;width:33%;'>
    <div style='font-size:24px;font-weight:700;color:#22c55e;'>${OB_COUNT}</div>
    <div style='font-size:11px;color:#64748b;margin-top:4px;'>DUE NEXT 30D</div>
  </td>
</tr>
</table>
</td></tr>

<!-- Alerts -->
<tr><td style='padding:20px 24px 8px;background:#111827;border-left:1px solid #2a3548;border-right:1px solid #2a3548;'>
  <h2 style='margin:0;color:#f1f5f9;font-size:15px;font-weight:600;'>Action Items</h2>
</td></tr>
<tr><td style='padding:0 24px 16px;background:#111827;border-left:1px solid #2a3548;border-right:1px solid #2a3548;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#1a2234;border-radius:8px;overflow:hidden;'>
${ALERT_ROWS:-<tr><td style='padding:16px;color:#22c55e;font-size:13px;text-align:center;'>All clear -- no pending alerts.</td></tr>}
</table>
</td></tr>

<!-- Obligations -->
<tr><td style='padding:8px 24px 8px;background:#111827;border-left:1px solid #2a3548;border-right:1px solid #2a3548;'>
  <h2 style='margin:0;color:#f1f5f9;font-size:15px;font-weight:600;'>Upcoming Due (Next 30 Days)</h2>
</td></tr>
<tr><td style='padding:0 24px 24px;background:#111827;border-left:1px solid #2a3548;border-right:1px solid #2a3548;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#1a2234;border-radius:8px;overflow:hidden;'>
<tr>
  <th style='padding:8px 16px;text-align:left;font-size:11px;color:#64748b;border-bottom:1px solid #2a3548;'>ITEM</th>
  <th style='padding:8px 16px;text-align:left;font-size:11px;color:#64748b;border-bottom:1px solid #2a3548;'>PROPERTY</th>
  <th style='padding:8px 16px;text-align:right;font-size:11px;color:#64748b;border-bottom:1px solid #2a3548;'>AMOUNT</th>
  <th style='padding:8px 16px;text-align:right;font-size:11px;color:#64748b;border-bottom:1px solid #2a3548;'>DUE</th>
</tr>
${OB_ROWS:-<tr><td colspan='4' style='padding:16px;color:#94a3b8;font-size:13px;text-align:center;'>Nothing due in the next 30 days.</td></tr>}
</table>
</td></tr>

<!-- CTA -->
<tr><td style='padding:0 24px 24px;background:#111827;border-left:1px solid #2a3548;border-right:1px solid #2a3548;border-radius:0 0 12px 12px;border-bottom:1px solid #2a3548;'>
  <a href='https://mcfadyen-properties.vercel.app' style='display:block;padding:12px;background:#3b82f6;color:#ffffff;text-align:center;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;'>Open Dashboard</a>
</td></tr>

<!-- Footer -->
<tr><td style='padding:16px 24px;text-align:center;'>
  <p style='margin:0;color:#475569;font-size:11px;'>McFadyen Property Hub -- Your virtual property manager</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"

# Send to Alex and Sarah
echo ""
echo "Sending digest emails..."

for RECIPIENT in "alex@getflowmortgage.ca" "sarahkmcfadyen@gmail.com"; do
  echo "  Sending to: $RECIPIENT"

  PAYLOAD=$(jq -n \
    --arg from "Property Hub <onboarding@resend.dev>" \
    --arg to "$RECIPIENT" \
    --arg subject "Property Digest -- $DIGEST_DATE" \
    --arg html "$HTML" \
    '{from: $from, to: $to, subject: $subject, html: $html}')

  RESPONSE=$(curl -sf -w "\n%{http_code}" \
    "https://api.resend.com/emails" \
    -H "Authorization: Bearer $RESEND_KEY" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" 2>&1 || true)

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "200" ]; then
    EMAIL_ID=$(echo "$BODY" | jq -r '.id // "unknown"')
    echo "  [OK] Sent (ID: $EMAIL_ID)"
  else
    echo "  [FAIL] HTTP $HTTP_CODE"
    echo "  Response: $BODY"
  fi
done

echo ""
echo "=== Digest complete ==="
