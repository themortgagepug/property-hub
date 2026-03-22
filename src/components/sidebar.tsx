"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  CalendarClock,
  DollarSign,
  FileText,
  Bell,
  Upload,
  TrendingUp,
  Settings,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/calendar", label: "Calendar", icon: CalendarClock },
  { href: "/finances", label: "Finances", icon: DollarSign },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/performance", label: "Performance", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-bg-secondary border-r border-border flex flex-col z-50">
      <div className="p-6 border-b border-border">
        <h1 className="text-lg font-bold tracking-tight text-text-primary">
          Property Hub
        </h1>
        <p className="text-xs text-text-muted mt-1">McFadyen Portfolio</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-accent-blue/15 text-accent-blue"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-bold">
            AM
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Alex & Sarah</p>
            <p className="text-xs text-text-muted">4 properties</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
