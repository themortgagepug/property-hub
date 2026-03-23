"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase, type Property, type Transaction } from "@/lib/supabase";
import { formatCurrency, formatCurrencyFull, categoryLabel } from "@/lib/format";
import { FileSpreadsheet, Download, Printer, Building2 } from "lucide-react";

const TAX_DEDUCTIBLE_CATEGORIES = ["insurance", "maintenance", "property_tax", "strata_fee", "mortgage", "utilities", "property_management", "other"];

type PropertyTaxSummary = {
  property: Property;
  rentalIncome: number;
  expensesByCategory: Record<string, number>;
  totalExpenses: number;
  taxDeductibleExpenses: number;
  netRentalIncome: number;
  transactions: Transaction[];
};

function buildSummaries(properties: Property[], transactions: Transaction[], year: number): PropertyTaxSummary[] {
  return properties.map((property) => {
    const propTx = transactions.filter((t) => {
      const txYear = new Date(t.date).getFullYear();
      return t.property_id === property.id && txYear === year;
    });

    const incomeTx = propTx.filter((t) => t.type === "income");
    const expenseTx = propTx.filter((t) => t.type === "expense");

    const rentalIncome = incomeTx.reduce((s, t) => s + t.amount, 0);
    const totalExpenses = expenseTx.reduce((s, t) => s + t.amount, 0);
    const taxDeductibleExpenses = expenseTx
      .filter((t) => t.is_tax_deductible)
      .reduce((s, t) => s + t.amount, 0);

    const expensesByCategory: Record<string, number> = {};
    expenseTx.forEach((t) => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });

    return {
      property,
      rentalIncome,
      expensesByCategory,
      totalExpenses,
      taxDeductibleExpenses,
      netRentalIncome: rentalIncome - totalExpenses,
      transactions: propTx,
    };
  });
}

function downloadCSV(summaries: PropertyTaxSummary[], year: number) {
  const rows: string[] = [
    ["Date", "Property", "Type", "Category", "Description", "Amount", "Tax Deductible"].join(","),
  ];

  summaries.forEach(({ property, transactions }) => {
    transactions.forEach((tx) => {
      rows.push(
        [
          tx.date,
          `"${property.name}"`,
          tx.type,
          tx.category,
          `"${(tx.description || "").replace(/"/g, '""')}"`,
          tx.type === "expense" ? `-${tx.amount.toFixed(2)}` : tx.amount.toFixed(2),
          tx.is_tax_deductible ? "Yes" : "No",
        ].join(",")
      );
    });
  });

  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `property-tax-export-${year}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function TaxExportPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    async function load() {
      const [propRes, txRes] = await Promise.all([
        supabase.from("properties").select("*").order("name"),
        supabase.from("transactions").select("*").order("date"),
      ]);
      setProperties(propRes.data || []);
      setTransactions(txRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const summaries = buildSummaries(properties, transactions, year);
  const portfolioIncome = summaries.reduce((s, p) => s + p.rentalIncome, 0);
  const portfolioExpenses = summaries.reduce((s, p) => s + p.totalExpenses, 0);
  const portfolioTaxDeductible = summaries.reduce((s, p) => s + p.taxDeductibleExpenses, 0);
  const portfolioNet = portfolioIncome - portfolioExpenses;

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Loading...</div>;
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tax Export</h1>
            <p className="text-text-muted text-sm mt-1">Annual rental income and expense summary for tax filing</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-auto"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={() => downloadCSV(summaries, year)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-green text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <Download size={16} /> Download CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-bg-card border border-border text-text-secondary rounded-lg text-sm font-medium hover:text-text-primary hover:bg-bg-card-hover transition-colors"
            >
              <Printer size={16} /> Print Summary
            </button>
          </div>
        </div>

        {/* Portfolio Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-text-muted uppercase tracking-wide">Total Rental Income</p>
            <p className="text-2xl font-bold mt-1 text-accent-green">{formatCurrency(portfolioIncome)}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-text-muted uppercase tracking-wide">Total Expenses</p>
            <p className="text-2xl font-bold mt-1 text-accent-red">{formatCurrency(portfolioExpenses)}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-text-muted uppercase tracking-wide">Tax Deductible</p>
            <p className="text-2xl font-bold mt-1 text-accent-orange">{formatCurrency(portfolioTaxDeductible)}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-text-muted uppercase tracking-wide">Net Rental Income</p>
            <p className={`text-2xl font-bold mt-1 ${portfolioNet >= 0 ? "text-accent-green" : "text-accent-red"}`}>
              {formatCurrency(portfolioNet)}
            </p>
          </div>
        </div>

        {/* Per-Property Summaries */}
        {summaries.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl p-12 text-center">
            <FileSpreadsheet size={48} className="mx-auto mb-4 text-text-muted" />
            <h3 className="font-semibold text-lg mb-2">No data for {year}</h3>
            <p className="text-text-muted text-sm">Add properties and transactions to generate a tax summary.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {summaries.map((summary) => (
              <div key={summary.property.id} className="bg-bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-purple/15 flex items-center justify-center text-accent-purple">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{summary.property.name}</h3>
                    <p className="text-xs text-text-muted">
                      {summary.property.address}, {summary.property.city}
                    </p>
                  </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-text-muted">Rental Income</p>
                    <p className="text-sm font-semibold text-accent-green mt-0.5">
                      {formatCurrency(summary.rentalIncome)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Total Expenses</p>
                    <p className="text-sm font-semibold text-accent-red mt-0.5">
                      {formatCurrency(summary.totalExpenses)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Tax Deductible</p>
                    <p className="text-sm font-semibold text-accent-orange mt-0.5">
                      {formatCurrency(summary.taxDeductibleExpenses)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Net Rental Income</p>
                    <p
                      className={`text-sm font-semibold mt-0.5 ${
                        summary.netRentalIncome >= 0 ? "text-accent-green" : "text-accent-red"
                      }`}
                    >
                      {formatCurrency(summary.netRentalIncome)}
                    </p>
                  </div>
                </div>

                {/* Expense Breakdown */}
                {Object.keys(summary.expensesByCategory).length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-wide">
                      Expenses by Category
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Object.entries(summary.expensesByCategory)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amount]) => {
                          const isDeductible = TAX_DEDUCTIBLE_CATEGORIES.includes(cat);
                          return (
                            <div
                              key={cat}
                              className={`rounded-lg p-3 border ${
                                isDeductible
                                  ? "bg-accent-orange/5 border-accent-orange/20"
                                  : "bg-bg-secondary border-border"
                              }`}
                            >
                              <p className="text-xs text-text-muted">{categoryLabel(cat)}</p>
                              <p className="text-sm font-semibold mt-0.5">{formatCurrency(amount)}</p>
                              {isDeductible && (
                                <p className="text-xs text-accent-orange mt-0.5">Tax deductible</p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {summary.transactions.length === 0 && (
                  <p className="text-xs text-text-muted italic mt-2">No transactions recorded for {year}.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print-only view */}
      <div className="hidden print:block font-sans text-black p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Property Tax Summary — {year}</h1>
          <p className="text-sm text-gray-600 mt-1">
            McFadyen Portfolio | Generated {new Date().toLocaleDateString("en-CA")}
          </p>
        </div>

        {/* Print Portfolio Totals */}
        <div className="grid grid-cols-4 gap-4 mb-8 border border-gray-300 rounded p-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Total Rental Income</p>
            <p className="text-lg font-bold">{formatCurrencyFull(portfolioIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Total Expenses</p>
            <p className="text-lg font-bold">{formatCurrencyFull(portfolioExpenses)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Tax Deductible</p>
            <p className="text-lg font-bold">{formatCurrencyFull(portfolioTaxDeductible)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Net Rental Income</p>
            <p className="text-lg font-bold">{formatCurrencyFull(portfolioNet)}</p>
          </div>
        </div>

        {summaries.map((summary) => (
          <div key={summary.property.id} className="mb-8 page-break-inside-avoid">
            <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-3">{summary.property.name}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {summary.property.address}, {summary.property.city}, {summary.property.province}
            </p>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">Rental Income</p>
                <p className="font-semibold">{formatCurrencyFull(summary.rentalIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Expenses</p>
                <p className="font-semibold">{formatCurrencyFull(summary.totalExpenses)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tax Deductible Expenses</p>
                <p className="font-semibold">{formatCurrencyFull(summary.taxDeductibleExpenses)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Rental Income</p>
                <p className="font-semibold">{formatCurrencyFull(summary.netRentalIncome)}</p>
              </div>
            </div>

            {Object.keys(summary.expensesByCategory).length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border border-gray-300">Category</th>
                    <th className="text-right p-2 border border-gray-300">Amount</th>
                    <th className="text-center p-2 border border-gray-300">Tax Deductible</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.expensesByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amount]) => (
                      <tr key={cat}>
                        <td className="p-2 border border-gray-300">{categoryLabel(cat)}</td>
                        <td className="p-2 border border-gray-300 text-right">{formatCurrencyFull(amount)}</td>
                        <td className="p-2 border border-gray-300 text-center">
                          {TAX_DEDUCTIBLE_CATEGORIES.includes(cat) ? "Yes" : "No"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
