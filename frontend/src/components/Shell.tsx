"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  FileSearch,
  Fingerprint,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Network,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  X,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Ingest & Extract", path: "/ingest", icon: Upload },
  { label: "Criminal Search", path: "/criminal-search", icon: Search },
  { label: "Cases", path: "/cases", icon: FolderOpen },
  { label: "Document Analysis", path: "/document-analysis", icon: FileSearch },
  { label: "Network Analysis", path: "/network-analysis", icon: Network },
  { label: "Connection Finder", path: "/connection-finder", icon: GitBranch },
  { label: "Timeline & Location", path: "/timeline-location", icon: BarChart3 },
  { label: "Cross-Case Intel", path: "/cross-case-intelligence", icon: Fingerprint },
  { label: "Alerts", path: "/alerts", icon: AlertTriangle },
  { label: "AI Evidence Assistant", path: "/ai-evidence-assistant", icon: ShieldCheck },
  { label: "Reports", path: "/reports", icon: FileSearch },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeItem =
    navItems.find((item) =>
      item.path === "/"
        ? pathname === "/"
        : pathname === item.path || pathname.startsWith(item.path + "/")
    ) ?? navItems[0];

  return (
    <div className="archive-shell">
      <aside className={`system-drawer ${sidebarOpen ? "system-drawer-open" : ""}`}>
        <div className="drawer-brand">
          <span>CYBER HUNTERS</span>
          <small>CRIME ANALYSIS SYSTEM</small>
        </div>
        <div className="drawer-rule" />
        <div className="drawer-label">INVESTIGATION</div>
        <nav className="drawer-scroll">
          {navItems.map((item, index) => {
            const isActive =
              item.path === "/"
                ? pathname === "/"
                : pathname === item.path || pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`drawer-item ${isActive ? "drawer-item-active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="drawer-index">{String(index + 1).padStart(2, "0")}</span>
                <span>{item.label}</span>
                <ChevronRight size={12} />
              </Link>
            );
          })}
        </nav>
        <div className="drawer-bottom">
          <div className="drawer-rule" />
          <div className="drawer-label">AUTHORIZED OPERATOR</div>
          <div className="operator-card">
            <div className="operator-avatar">IO</div>
            <div>
              <b>INVESTIGATOR</b>
              <small>Cyber Crime Unit</small>
              <small>Session: active / secured</small>
            </div>
          </div>
          <Link href="/" className="logout-button" onClick={() => setSidebarOpen(false)}>
            <LockKeyhole size={13} /> RETURN TO HOME
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <button className="drawer-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close system navigation" />
      )}

      <header className="archive-header">
        <div className="header-kicker">CYBER HUNTERS // CRIMINAL NETWORK ANALYSIS SYSTEM</div>
        <div className="header-mainline">
          <button className="menu-button" onClick={() => setSidebarOpen((v) => !v)} aria-label="Open system navigation">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <h1>CRIME ANALYSIS SYSTEM</h1>
          <span className="header-stamp">[RESTRICTED]</span>
        </div>
        <div className="header-meta">
          <span>OPERATOR: INVESTIGATOR / CYBER CRIME UNIT</span>
          <span>SYSTEM: CYBER_HUNTER_V.2.0</span>
          <span>VIEW: {activeItem.label.toUpperCase()}</span>
        </div>
      </header>

      <div className="critical-strip">
        <span>RESTRICTED SYSTEM — FOR AUTHORIZED INVESTIGATIVE USE ONLY</span>
        <Link href="/ingest" onClick={() => setSidebarOpen(false)}>
          INGEST NEW CASE <ArrowRight size={12} />
        </Link>
      </div>

      <main className="archive-main">{children}</main>

      <footer className="archive-footer">
        <span>TERMINAL: CYBER_HUNTER_V.2.0 // NEO4J GDS CONNECTED</span>
        <span>NO UNAUTHORIZED ACCESS // STATE SECRET</span>
      </footer>
    </div>
  );
}
