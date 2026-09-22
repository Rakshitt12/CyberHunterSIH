"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Flame, GitBranch, Repeat } from "lucide-react";
import { EmptyState } from "@/components/ui";
import type { BurnerPhone, CaseAnalytics } from "@/api/types";

// Alerts section (§21/22): full burner detail + cycle + cross-case alerts
// for THIS case. Overview shows only the compact count.
export default function CaseAlerts({
  caseId,
  analytics,
  burnerPhones,
}: {
  caseId: string;
  analytics: CaseAnalytics | null;
  burnerPhones: BurnerPhone[];
}) {
  const cycles = analytics?.money_laundering_cycles ?? [];
  const xlinks = analytics?.cross_case_links ?? [];
  const total = burnerPhones.length + cycles.length + xlinks.length;

  if (total === 0) {
    return (
      <EmptyState
        title="NO ACTIVE ALERTS"
        body="Burner-phone, laundering-cycle and cross-case scans report nothing for this case."
      />
    );
  }

  return (
    <div className="space-y-6">
      {burnerPhones.length > 0 && (
        <section className="collision-panel p-4 border-[#8d3d3c] bg-[#8d3d3c]/10 space-y-3">
          <div className="flex items-center gap-3 border-b border-[#8d3d3c]/30 pb-3">
            <span className="p-1.5 border border-[#8d3d3c] text-[#bd7470] bg-[#121514]">
              <Flame className="w-4 h-4" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#bd7470] font-mono">
              Burner Phones — {burnerPhones.length} flagged
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {burnerPhones.map((bp, i) => (
              <div key={i} className="p-3 border border-[#8d3d3c]/30 bg-[#121514] space-y-2 text-xs">
                <div className="font-mono font-bold text-[#c8c8ba]">{bp.phone_number}</div>
                <div className="border-l-2 border-[#8d3d3c] pl-2.5 text-[11px] text-[#8a8d83]">
                  <strong className="text-[#bd7470]">Why flagged: </strong>
                  <span>{bp.flag_reason}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {cycles.length > 0 && (
        <section className="collision-panel p-4 border-[#8d3d3c] bg-[#8d3d3c]/10 space-y-3">
          <div className="flex items-center gap-3 border-b border-[#8d3d3c]/30 pb-3">
            <span className="p-1.5 border border-[#8d3d3c] text-[#bd7470] bg-[#121514]">
              <Repeat className="w-4 h-4" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#bd7470] font-mono">
              Laundering Cycles — {cycles.length} detected
            </h2>
          </div>
          {cycles.map((c, i) => (
            <div key={i} className="p-3 border border-[#8d3d3c]/30 bg-[#121514] font-mono text-xs text-[#c8c8ba]">
              {(c.accounts ?? []).join(" → ")}
            </div>
          ))}
        </section>
      )}

      {xlinks.length > 0 && (
        <section className="collision-panel p-4 border-[#b59858] bg-[#b59858]/10 space-y-3">
          <div className="flex items-center gap-3 border-b border-[#b59858]/30 pb-3">
            <span className="p-1.5 border border-[#b59858] text-[#c5bf55] bg-[#121514]">
              <GitBranch className="w-4 h-4" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#c5bf55] font-mono">
              Cross-Case Matches — {xlinks.length} entities
            </h2>
          </div>
          {xlinks.map((l, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <span className="text-[#c8c8ba] font-bold">
                {l.identifier} <span className="text-[#5e625c]">→ {l.other_cases?.join(", ")}</span>
              </span>
              <Link href={`/cross-case-intelligence`} className="table-action">
                <span>Intel</span>
                <ArrowRight size={11} />
              </Link>
            </div>
          ))}
        </section>
      )}

      {cycles.length === 0 && (
        <div className="form-message success flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>No laundering cycles in this case.</span>
        </div>
      )}
    </div>
  );
}
