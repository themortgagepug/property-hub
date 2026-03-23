"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase, type Property, type Obligation } from "@/lib/supabase";
import { formatCurrency, formatDate, daysUntil, categoryLabel } from "@/lib/format";
import { AlertTriangle, ChevronLeft, ChevronRight, X } from "lucide-react";

type ObligationWithProperty = Obligation & { property?: Property };

const CATEGORY_COLORS: Record<string, string> = {
  mortgage: "bg-accent-blue",
  property_tax: "bg-accent-purple",
  strata_fee: "bg-accent-orange",
  insurance: "bg-accent-yellow",
  utilities: "bg-accent-green",
  maintenance: "bg-accent-red",
  other: "bg-text-muted",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "bg-text-muted";
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const [propRes, oblRes] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("obligations").select("*").eq("is_active", true).order("due_date"),
      ]);
      setProperties(propRes.data || []);
      setObligations(oblRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const { year, month } = viewDate;

  function prevMonth() {
    setSelectedDay(null);
    setViewDate(v => {
      if (v.month === 0) return { year: v.year - 1, month: 11 };
      return { year: v.year, month: v.month - 1 };
    });
  }

  function nextMonth() {
    setSelectedDay(null);
    setViewDate(v => {
      if (v.month === 11) return { year: v.year + 1, month: 0 };
      return { year: v.year, month: v.month + 1 };
    });
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });

  // First day of month (0=Sun, 6=Sat) and total days
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const obligationsWithProp: ObligationWithProperty[] = obligations.map(o => ({
    ...o,
    property: properties.find(p => p.id === o.property_id),
  }));

  // Map day number -> obligations for this month
  const byDay: Record<number, ObligationWithProperty[]> = {};
  obligationsWithProp.forEach(o => {
    if (o.due_date && o.due_date.startsWith(monthStr)) {
      const day = parseInt(o.due_date.split("-")[2], 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(o);
    }
  });

  const overdue = obligationsWithProp.filter(
    o => o.due_date && daysUntil(o.due_date) !== null && daysUntil(o.due_date)! < 0
  );

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  // Build grid cells
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - firstDayOfWeek + 1;
    cells.push(day >= 1 && day <= daysInMonth ? day : null);
  }

  const selectedObligations = selectedDay ? (byDay[selectedDay] || []) : [];

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-text-muted">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-text-muted text-sm mt-1">Monthly obligations across your portfolio</p>
      </div>

      {overdue.length > 0 && (
        <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-5">
          <h2 className="font-semibold text-accent-red flex items-center gap-2 mb-3">
            <AlertTriangle size={18} /> Overdue ({overdue.length})
          </h2>
          <div className="space-y-2">
            {overdue.map(ob => (
              <div key={ob.id} className="flex items-center justify-between bg-bg-card rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{ob.name}</p>
                  <p className="text-xs text-text-muted">{ob.property?.name} -- {categoryLabel(ob.category)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(ob.amount)}</p>
                  <p className="text-xs text-accent-red">{formatDate(ob.due_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        {/* Month navigation header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-bg-card-hover transition-colors text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-semibold text-lg">{monthLabel}</h2>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-bg-card-hover transition-colors text-text-secondary hover:text-text-primary"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-text-muted">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-border">
          {cells.map((day, idx) => {
            const isToday = day === todayDay;
            const hasItems = day !== null && byDay[day]?.length > 0;
            const isSelected = day === selectedDay;
            const items = day ? (byDay[day] || []) : [];
            const isWeekend = idx % 7 === 0 || idx % 7 === 6;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (day === null) return;
                  setSelectedDay(isSelected ? null : day);
                }}
                className={`min-h-[80px] p-2 border-b border-border transition-colors ${
                  day === null ? "bg-bg-primary/30" : "cursor-pointer"
                } ${isSelected ? "bg-accent-blue/10" : hasItems ? "hover:bg-bg-card-hover" : day !== null ? "hover:bg-bg-card-hover/50" : ""} ${isWeekend && day !== null ? "bg-bg-secondary/30" : ""}`}
              >
                {day !== null && (
                  <>
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? "bg-accent-blue text-white" : "text-text-secondary"
                    }`}>
                      {day}
                    </div>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {items.slice(0, 4).map(ob => (
                        <span
                          key={ob.id}
                          title={ob.name}
                          className={`w-2 h-2 rounded-full ${getCategoryColor(ob.category)} flex-shrink-0`}
                        />
                      ))}
                      {items.length > 4 && (
                        <span className="text-xs text-text-muted leading-none">+{items.length - 4}</span>
                      )}
                    </div>
                    {items.length === 1 && (
                      <p className="text-xs text-text-muted mt-1 truncate leading-tight">
                        {items[0].name}
                      </p>
                    )}
                    {items.length > 1 && (
                      <p className="text-xs text-text-muted mt-1 leading-tight">
                        {items.length} items
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay !== null && (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold">
              {new Date(year, month, selectedDay).toLocaleDateString("en-CA", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          {selectedObligations.length === 0 ? (
            <div className="p-6 text-center text-text-muted text-sm">No obligations on this day.</div>
          ) : (
            <div className="divide-y divide-border">
              {selectedObligations.map(ob => {
                const days = daysUntil(ob.due_date);
                return (
                  <div key={ob.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getCategoryColor(ob.category)}`} />
                      <div>
                        <p className="text-sm font-medium">{ob.name}</p>
                        <p className="text-xs text-text-muted">
                          {ob.property?.name} -- {categoryLabel(ob.category)}
                          {ob.auto_pay && <span className="ml-2 text-accent-green">Auto-pay</span>}
                          {ob.provider && <span className="ml-2">{ob.provider}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(ob.amount)}</p>
                      {days !== null && days < 0 && (
                        <p className="text-xs text-accent-red">{Math.abs(days)}d overdue</p>
                      )}
                      {days !== null && days === 0 && (
                        <p className="text-xs text-accent-orange">Due today</p>
                      )}
                      {days !== null && days > 0 && (
                        <p className="text-xs text-text-muted">in {days}d</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Color legend */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-wide">Category Colors</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-xs text-text-secondary">{categoryLabel(cat)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
