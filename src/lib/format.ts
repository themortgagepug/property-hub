export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '--'
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyFull(amount: number | null | undefined): string {
  if (amount == null) return '--'
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '--'
  return new Date(date + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  const target = new Date(date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function urgencyColor(days: number | null): string {
  if (days === null) return 'text-gray-400'
  if (days < 0) return 'text-red-400'
  if (days <= 7) return 'text-orange-400'
  if (days <= 30) return 'text-yellow-400'
  return 'text-green-400'
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    property_tax: 'Property Tax',
    strata_fee: 'Strata Fee',
    insurance: 'Insurance',
    mortgage: 'Mortgage',
    utilities: 'Utilities',
    maintenance: 'Maintenance',
    speculation_tax: 'Speculation Tax',
    special_levy: 'Special Levy',
    property_management: 'Property Mgmt',
    other: 'Other',
    rent: 'Rent',
    tax_notice: 'Tax Notice',
    assessment: 'Assessment',
    strata: 'Strata',
    lease: 'Lease',
    receipt: 'Receipt',
    invoice: 'Invoice',
    correspondence: 'Correspondence',
    inspection: 'Inspection',
  }
  return labels[category] || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function propertyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    primary_residence: 'Primary Residence',
    rental: 'Rental',
    vacation: 'Vacation',
  }
  return labels[type] || type
}
