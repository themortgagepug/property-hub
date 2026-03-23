import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Property = {
  id: string
  name: string
  address: string
  city: string
  province: string
  postal_code: string | null
  property_type: 'primary_residence' | 'rental' | 'vacation'
  ownership: string
  purchase_date: string | null
  purchase_price: number | null
  current_value: number | null
  is_strata: boolean
  strata_plan: string | null
  lot_size: string | null
  building_size: string | null
  bedrooms: number | null
  bathrooms: number | null
  parking: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Tenant = {
  id: string
  property_id: string
  name: string
  email: string | null
  phone: string | null
  lease_start: string | null
  lease_end: string | null
  monthly_rent: number | null
  security_deposit: number | null
  pet_deposit: number | null
  is_active: boolean
  notes: string | null
}

export type Obligation = {
  id: string
  property_id: string
  category: string
  name: string
  amount: number | null
  frequency: string | null
  due_date: string | null
  auto_pay: boolean
  provider: string | null
  account_number: string | null
  notes: string | null
  is_active: boolean
}

export type Transaction = {
  id: string
  property_id: string
  obligation_id: string | null
  tenant_id: string | null
  type: 'income' | 'expense'
  category: string
  description: string | null
  amount: number
  date: string
  is_tax_deductible: boolean
  receipt_url: string | null
  notes: string | null
}

export type Alert = {
  id: string
  property_id: string | null
  type: 'deadline' | 'action' | 'review' | 'opportunity' | 'warning'
  title: string
  description: string | null
  due_date: string | null
  status: 'pending' | 'acknowledged' | 'completed' | 'dismissed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  action_url: string | null
  created_at: string
  completed_at: string | null
}

export type Mortgage = {
  id: string
  property_id: string
  lender: string
  original_amount: number | null
  current_balance: number | null
  interest_rate: number | null
  rate_type: 'fixed' | 'variable' | 'adjustable' | null
  term_start: string | null
  term_end: string | null
  amortization_end: string | null
  payment_amount: number | null
  payment_frequency: string
  prepayment_privilege: string | null
  notes: string | null
}

export type Document = {
  id: string
  property_id: string | null
  category: string | null
  name: string
  file_url: string
  file_type: string | null
  extracted_data: Record<string, unknown> | null
  date: string
  notes: string | null
}

export type Unit = {
  id: string
  property_id: string
  name: string
  is_rented: boolean
  current_rent: number | null
  tenant_name: string | null
  tenant_email: string | null
  tenant_phone: string | null
  lease_start: string | null
  lease_end: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Budget = {
  id: string
  property_id: string
  category: string
  year: number
  monthly_budget: number | null
  annual_budget: number | null
  notes: string | null
}
