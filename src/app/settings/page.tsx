"use client";

import { Settings, Mail, Bell, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-text-muted text-sm mt-1">Configure your Property Hub</p>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Mail size={18} className="text-accent-blue" />
          Email Intake
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Intake Email Address</label>
            <div className="bg-bg-secondary rounded-lg px-4 py-3 font-mono text-sm text-accent-blue">
              property@getflowmortgage.ca
            </div>
            <p className="text-xs text-text-muted mt-1">Forward bills, receipts, and notices to this address</p>
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Bell size={18} className="text-accent-orange" />
          Notifications
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Weekly Digest</p>
              <p className="text-xs text-text-muted">Summary of upcoming obligations and action items</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green/15 text-accent-green">Active</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Deadline Alerts</p>
              <p className="text-xs text-text-muted">30 days before major deadlines</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green/15 text-accent-green">Active</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Overdue Warnings</p>
              <p className="text-xs text-text-muted">Immediate alert when something is overdue</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green/15 text-accent-green">Active</span>
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Database size={18} className="text-accent-purple" />
          Data
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Database</p>
              <p className="text-xs text-text-muted">Supabase (shared instance)</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green/15 text-accent-green">Connected</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Document Storage</p>
              <p className="text-xs text-text-muted">Supabase Storage (property-docs bucket)</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green/15 text-accent-green">Connected</span>
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Settings size={18} className="text-text-secondary" />
          About
        </h2>
        <div className="text-sm text-text-secondary space-y-1">
          <p>Property Hub v1.0</p>
          <p>Built for Alex & Sarah McFadyen</p>
          <p>Managed by Claude -- your virtual property manager</p>
        </div>
      </div>
    </div>
  );
}
