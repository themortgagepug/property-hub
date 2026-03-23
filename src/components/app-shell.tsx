"use client";

import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // Show loading while auth resolves
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-text-muted text-sm">Loading...</div>
      </div>
    );
  }

  // Login page: render without sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Not logged in and not on login page: show nothing (AuthProvider will redirect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-text-muted text-sm">Redirecting...</div>
      </div>
    );
  }

  // Authenticated: render with sidebar
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
