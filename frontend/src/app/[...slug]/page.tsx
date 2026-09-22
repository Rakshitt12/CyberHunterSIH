"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, ArrowRight } from "lucide-react";

export default function PlaceholderPage() {
  const pathname = usePathname();
  const formatted = pathname ? pathname.replace(/^\//, "").replace(/-/g, " ").toUpperCase() : "MODULE";

  return (
    <div className="space-y-6">
      <section className="case-intro">
        <div>
          <div className="section-code">SYSTEM MODULE // WORKSPACE REGISTER</div>
          <h2>{formatted}</h2>
          <p>
            This operational module is scheduled for release in Phase 2 of the Cyber Hunters deployment.
            Core investigation features (Ingestion, NER Extraction, Proof-of-Source Graph, and Neo4j GDS Analytics) are currently active.
          </p>
        </div>
        <div className="case-id-block">
          <span>MODULE STATUS</span>
          <b>COMING IN PHASE 2</b>
        </div>
      </section>

      <section className="collision-panel p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="empty-state-icon">
          <FolderOpen size={20} />
        </div>
        <b className="text-sm font-normal tracking-wide text-[#c8c8ba]">
          WORKSPACE COMING IN PHASE 2
        </b>
        <p className="text-xs text-[#8a8d83] max-w-md leading-relaxed">
          The module for <span className="font-mono text-[#c5bf55]">{pathname}</span> is under scheduled development.
          Active investigation modules are accessible from the main control register.
        </p>
        <div className="flex flex-wrap gap-3 pt-2 justify-center">
          <Link href="/" className="table-action">
            <span>RETURN TO DASHBOARD</span>
            <ArrowRight size={11} />
          </Link>
          <Link href="/ingest" className="commit-button">
            <span>OPEN DATA INGESTION</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      </section>
    </div>
  );
}
