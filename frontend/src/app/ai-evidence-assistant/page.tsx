"use client";

import React from "react";
import Link from "next/link";
import { Bot } from "lucide-react";

// AI Evidence Assistant — intentionally deferred (§1/§30). Kept as a
// clearly marked Coming Soon module so navigation stays complete.
export default function AiEvidenceAssistantPage() {
  return (
    <div className="space-y-6">
      <section className="case-intro">
        <div>
          <div className="section-code">System Module // Workspace Register</div>
          <h2>AI EVIDENCE ASSISTANT</h2>
          <p>
            A grounded assistant that translates questions into real graph
            queries and reports only real results is scheduled for a later
            phase. It is intentionally not active yet.
          </p>
        </div>
        <div className="case-id-block">
          <span>Module Status</span>
          <b>COMING SOON</b>
        </div>
      </section>

      <div className="collision-panel">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Bot size={16} />
          </div>
          <b>COMING SOON</b>
          <p>
            Grounded Q&amp;A over the case graph — no general-knowledge answers,
            query results only. Meanwhile, investigation search and the case
            workspace cover this workflow.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/criminal-search" className="table-action mt-2">
              <span>OPEN CRIMINAL SEARCH</span>
            </Link>
            <Link href="/" className="table-action mt-2">
              <span>RETURN TO DASHBOARD</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
