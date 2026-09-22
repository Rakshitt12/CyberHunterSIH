"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, FolderOpen, Loader2 } from "lucide-react";

// Shared loading / error / empty states + filters in the existing
// archive visual language. Every module imports from here.

export function LoadingState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <Loader2 size={22} className="animate-spin" />
      <b>{text}</b>
    </div>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div>
      <div className="form-message error flex items-center gap-2">
        <AlertTriangle size={14} />
        <span>{text}</span>
      </div>
      {onRetry && (
        <button className="table-action mt-3" onClick={onRetry}>
          <span>RETRY</span>
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <FolderOpen size={16} />
      </div>
      <b>{title}</b>
      {body && <p>{body}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="table-action mt-2">
          <span>{actionLabel}</span>
        </Link>
      )}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        className="dotted-input flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button type="submit" className="commit-button">
        <span>SEARCH</span>
      </button>
    </form>
  );
}

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[10px] font-mono text-[#8a8d83]">
      <span className="uppercase tracking-wider">{label}</span>
      <select
        className="case-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SectionHeader({
  code,
  title,
  right,
}: {
  code: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="panel-header">
      <div>
        <div className="section-code">{code}</div>
        <h2>{title}</h2>
      </div>
      {right && <div className="panel-tools">{right}</div>}
    </div>
  );
}
