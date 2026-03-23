-- Units table: each property can have multiple units (main, suite, etc)
CREATE TABLE IF NOT EXISTS units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Main Unit", "Basement Suite", "Unit 10"
  is_rented BOOLEAN DEFAULT false,
  current_rent NUMERIC(10,2),
  tenant_name TEXT,
  tenant_email TEXT,
  tenant_phone TEXT,
  lease_start DATE,
  lease_end DATE, -- NULL if month-to-month
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_units" ON units FOR SELECT USING (true);
CREATE POLICY "public_write_units" ON units FOR ALL USING (true);
