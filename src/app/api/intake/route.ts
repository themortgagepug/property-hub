export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Keyword-to-category mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  property_tax: ["property tax", "pta", "bc assessment", "assessed value", "tax notice", "annual property tax"],
  insurance: ["insurance", "policy", "premium", "coverage", "deductible", "claim"],
  strata_fee: ["strata", "strata fee", "strata levy", "special levy", "strata council", "bylaw"],
  mortgage: ["mortgage", "lender", "renewal", "rate hold", "prepayment", "amortization", "discharge"],
  utilities: ["hydro", "electricity", "gas", "water", "sewer", "utility", "fortis", "bc hydro"],
  maintenance: ["maintenance", "repair", "plumber", "electrician", "contractor", "inspection", "hvac", "roof", "gutters"],
  rent: ["rent", "rental payment", "lease payment", "tenant payment"],
  other: [],
};

function detectCategory(subject: string, body: string): string {
  const text = `${subject} ${body}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "other") continue;
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }
  return "other";
}

function matchProperty(
  subject: string,
  body: string,
  properties: Array<{ id: string; name: string; address: string }>
): string | null {
  const text = `${subject} ${body}`.toLowerCase();
  // Try to match by address fragments or property name
  for (const prop of properties) {
    const nameLower = prop.name.toLowerCase();
    const addrLower = prop.address.toLowerCase();
    // Match on key parts of address (street number + street name)
    const addrParts = addrLower.split(/[\s,]+/).filter((p) => p.length > 2);
    if (addrParts.some((part) => text.includes(part))) return prop.id;
    // Match on property name keywords
    const nameParts = nameLower.split(/[\s-]+/).filter((p) => p.length > 2);
    if (nameParts.some((part) => text.includes(part))) return prop.id;
  }
  return null;
}

export async function POST(request: Request) {
  let body: {
    from?: string;
    subject?: string;
    body?: string;
    attachments?: Array<{
      filename: string;
      content_base64: string;
      content_type: string;
    }>;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { from, subject = "", body: emailBody = "", attachments = [] } = body;

  if (!from) {
    return Response.json({ error: "Missing required field: from" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Fetch all properties for matching
  const { data: properties, error: propError } = await supabase
    .from("properties")
    .select("id, name, address");

  if (propError) {
    return Response.json({ error: "Failed to fetch properties", detail: propError.message }, { status: 500 });
  }

  const propertyId = matchProperty(subject, emailBody, properties || []);
  const category = detectCategory(subject, emailBody);

  const results: { stored: string[]; errors: string[] } = {
    stored: [],
    errors: [],
  };

  // Process each attachment
  for (const attachment of attachments) {
    const { filename, content_base64, content_type } = attachment;

    if (!filename || !content_base64) {
      results.errors.push(`Skipped attachment with missing filename or content`);
      continue;
    }

    // Decode base64 to binary
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(content_base64, "base64");
    } catch {
      results.errors.push(`Failed to decode attachment: ${filename}`);
      continue;
    }

    // Build a storage path: property_id/year/filename (or inbox/ if no match)
    const year = new Date().getFullYear();
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = propertyId
      ? `${propertyId}/${year}/${Date.now()}_${safeFilename}`
      : `inbox/${year}/${Date.now()}_${safeFilename}`;

    // Upload to Supabase storage bucket "property-docs"
    const { error: uploadError } = await supabase.storage
      .from("property-docs")
      .upload(storagePath, fileBuffer, {
        contentType: content_type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      results.errors.push(`Upload failed for ${filename}: ${uploadError.message}`);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("property-docs")
      .getPublicUrl(storagePath);

    const fileUrl = urlData?.publicUrl || storagePath;

    // Create document record
    const { error: docError } = await supabase.from("documents").insert({
      property_id: propertyId,
      category,
      name: filename,
      file_url: fileUrl,
      file_type: content_type || null,
      extracted_data: {
        source: "email_intake",
        from,
        subject,
        received_at: new Date().toISOString(),
      },
      date: new Date().toISOString().split("T")[0],
      notes: `Auto-ingested from email: ${subject}`,
    });

    if (docError) {
      results.errors.push(`Document record failed for ${filename}: ${docError.message}`);
    } else {
      results.stored.push(filename);
    }
  }

  // If no attachments, create a document record for the email itself
  if (attachments.length === 0) {
    const { error: docError } = await supabase.from("documents").insert({
      property_id: propertyId,
      category,
      name: subject || "Email (no subject)",
      file_url: "",
      file_type: "email",
      extracted_data: {
        source: "email_intake",
        from,
        subject,
        body_preview: emailBody.slice(0, 500),
        received_at: new Date().toISOString(),
      },
      date: new Date().toISOString().split("T")[0],
      notes: `Auto-ingested email from ${from}`,
    });

    if (docError) {
      results.errors.push(`Document record failed: ${docError.message}`);
    } else {
      results.stored.push("email-record");
    }
  }

  return Response.json({
    success: results.errors.length === 0,
    property_id: propertyId,
    category,
    stored: results.stored,
    errors: results.errors.length > 0 ? results.errors : undefined,
  });
}
