-- Property Hub Schema
-- Run this in Supabase SQL Editor

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- e.g. "Main Residence" or "Rental - 123 Oak St"
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Kelowna',
  province TEXT NOT NULL DEFAULT 'BC',
  postal_code TEXT,
  property_type TEXT NOT NULL CHECK (property_type IN ('primary_residence', 'rental', 'vacation')),
  ownership TEXT DEFAULT 'joint', -- joint, alex, sarah
  purchase_date DATE,
  purchase_price NUMERIC(12,2),
  current_value NUMERIC(12,2),
  is_strata BOOLEAN DEFAULT false,
  strata_plan TEXT,
  lot_size TEXT,
  building_size TEXT,
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  parking TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  lease_start DATE,
  lease_end DATE, -- NULL if month-to-month
  monthly_rent NUMERIC(10,2),
  security_deposit NUMERIC(10,2),
  pet_deposit NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Obligations: recurring financial items per property
CREATE TABLE IF NOT EXISTS obligations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'property_tax', 'strata_fee', 'insurance', 'mortgage',
    'utilities', 'maintenance', 'speculation_tax', 'special_levy',
    'property_management', 'other'
  )),
  name TEXT NOT NULL, -- e.g. "2026 Property Tax", "Strata Monthly"
  amount NUMERIC(12,2),
  frequency TEXT CHECK (frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual', 'one_time')),
  due_date DATE, -- next due date
  auto_pay BOOLEAN DEFAULT false,
  provider TEXT, -- insurance company, utility provider, etc.
  account_number TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions: actual money in/out
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_tax_deductible BOOLEAN DEFAULT false,
  receipt_url TEXT, -- Supabase storage path
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents: photos, receipts, bills, assessments
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  category TEXT CHECK (category IN (
    'tax_notice', 'assessment', 'insurance', 'strata',
    'lease', 'receipt', 'invoice', 'correspondence',
    'maintenance', 'inspection', 'other'
  )),
  name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Supabase storage path
  file_type TEXT, -- image/pdf/etc
  extracted_data JSONB, -- OCR results, parsed amounts, dates
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts: proactive reminders and action items
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deadline', 'action', 'review', 'opportunity', 'warning')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed', 'dismissed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url TEXT, -- link to take action
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Budgets: per property per category per year
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  monthly_budget NUMERIC(10,2),
  annual_budget NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, category, year)
);

-- Mortgage details
CREATE TABLE IF NOT EXISTS mortgages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  lender TEXT NOT NULL,
  original_amount NUMERIC(12,2),
  current_balance NUMERIC(12,2),
  interest_rate NUMERIC(5,3),
  rate_type TEXT CHECK (rate_type IN ('fixed', 'variable', 'adjustable')),
  term_start DATE,
  term_end DATE, -- renewal date
  amortization_end DATE,
  payment_amount NUMERIC(10,2),
  payment_frequency TEXT DEFAULT 'monthly',
  prepayment_privilege TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortgages ENABLE ROW LEVEL SECURITY;

-- Public read policies (same pattern as brain table)
CREATE POLICY "public_read_properties" ON properties FOR SELECT USING (true);
CREATE POLICY "public_read_tenants" ON tenants FOR SELECT USING (true);
CREATE POLICY "public_read_obligations" ON obligations FOR SELECT USING (true);
CREATE POLICY "public_read_transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "public_read_documents" ON documents FOR SELECT USING (true);
CREATE POLICY "public_read_alerts" ON alerts FOR SELECT USING (true);
CREATE POLICY "public_read_budgets" ON budgets FOR SELECT USING (true);
CREATE POLICY "public_read_mortgages" ON mortgages FOR SELECT USING (true);

-- Public write policies (for now, tighten later with auth)
CREATE POLICY "public_write_properties" ON properties FOR ALL USING (true);
CREATE POLICY "public_write_tenants" ON tenants FOR ALL USING (true);
CREATE POLICY "public_write_obligations" ON obligations FOR ALL USING (true);
CREATE POLICY "public_write_transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "public_write_documents" ON documents FOR ALL USING (true);
CREATE POLICY "public_write_alerts" ON alerts FOR ALL USING (true);
CREATE POLICY "public_write_budgets" ON budgets FOR ALL USING (true);
CREATE POLICY "public_write_mortgages" ON mortgages FOR ALL USING (true);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('property-docs', 'property-docs', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "public_read_storage" ON storage.objects FOR SELECT USING (bucket_id = 'property-docs');
CREATE POLICY "public_write_storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-docs');
