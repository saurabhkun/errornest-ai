/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertOctagon,
  AlertTriangle,
  RotateCcw,
  Plus,
  Bookmark,
  Trash2,
  UserCheck,
  EyeOff,
  CheckCircle,
  X,
  Sparkles,
  ListFilter,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";

interface IssuesClientProps {
  org: {
    id: string;
    slug: string;
  };
  project: {
    id: string;
    name: string;
    slug: string;
  };
  members: {
    id: string;
    displayName: string;
    email: string;
  }[];
  environments: {
    id: string;
    name: string;
  }[];
  releases: {
    id: string;
    version: string;
  }[];
}

interface Issue {
  id: string;
  title: string;
  errorType: string;
  normalizedMessage: string;
  status: "UNRESOLVED" | "RESOLVED" | "REOPENED" | "IGNORED";
  level: "FATAL" | "ERROR" | "WARNING" | "INFO";
  occurrenceCount: number;
  affectedUserCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  assigneeUserId: string | null;
  assignee?: {
    id: string;
    displayName: string;
    email: string;
  } | null;
}

interface SavedFilter {
  id: string;
  name: string;
  search: string;
  status: string;
  level: string;
  envFilter: string;
  releaseFilter: string;
  assigneeFilter: string;
  sortField: "lastSeenAt" | "occurrenceCount" | "firstSeenAt";
  sortDirection: "asc" | "desc";
}

export function IssuesClient({ org, project, members, environments, releases }: IssuesClientProps) {
  // Search & Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [envFilter, setEnvFilter] = useState<string>("");
  const [releaseFilter, setReleaseFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [sortField, setSortField] = useState<"lastSeenAt" | "occurrenceCount" | "firstSeenAt">(
    "lastSeenAt"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Bulk selection state
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [isBulkActionRunning, setIsBulkActionRunning] = useState(false);

  // Saved Filters state
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [newFilterName, setNewFilterName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Data state
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Saved Filters
  useEffect(() => {
    const key = `errornest:saved-filters:${project.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, [project.id]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      // Reset pagination when search query changes
      setCurrentCursor(null);
      setCursorHistory([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination when filters change
  const handleFilterChange = (setter: (v: string) => void, val: string) => {
    setter(val);
    setCurrentCursor(null);
    setCursorHistory([]);
  };

  // Reset selection on filter/pagination changes
  useEffect(() => {
    setSelectedIssueIds([]);
  }, [
    debouncedSearch,
    status,
    level,
    envFilter,
    releaseFilter,
    assigneeFilter,
    sortField,
    sortDirection,
    currentCursor,
  ]);

  const fetchIssues = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        projectId: project.id,
        sort: sortField,
        direction: sortDirection,
        pageSize: "15",
      });

      if (debouncedSearch) params.append("q", debouncedSearch);
      if (status) params.append("status", status);
      if (level) params.append("level", level);
      if (envFilter) params.append("environment", envFilter);
      if (releaseFilter) params.append("release", releaseFilter);
      if (assigneeFilter) params.append("assignee", assigneeFilter);
      if (currentCursor) params.append("cursor", currentCursor);

      const res = await fetch(`/api/v1/issues?${params.toString()}`);
      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error?.message || "Failed to fetch issues");
      }

      const body = await res.json();
      setIssues(body.data || []);
      setNextCursor(body.meta?.nextCursor || null);
      setHasMore(body.meta?.hasMore || false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load issues");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    project.id,
    debouncedSearch,
    status,
    level,
    envFilter,
    releaseFilter,
    assigneeFilter,
    sortField,
    sortDirection,
    currentCursor,
  ]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchIssues();
  };

  const handleNextPage = () => {
    if (nextCursor) {
      setCursorHistory((prev) => [...prev, currentCursor || ""]);
      setCurrentCursor(nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prev = [...cursorHistory];
      const popped = prev.pop() || null;
      setCursorHistory(prev);
      setCurrentCursor(popped === "" ? null : popped);
    }
  };

  // Inline action: change issue status
  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to update status");
      }
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === issueId
            ? { ...iss, status: newStatus as "UNRESOLVED" | "RESOLVED" | "REOPENED" | "IGNORED" }
            : iss
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating status");
    }
  };

  // Inline action: change issue assignee
  const handleAssigneeChange = async (issueId: string, userId: string | null) => {
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to assign issue");
      }
      const updated = await res.json();
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === issueId
            ? { ...iss, assigneeUserId: userId, assignee: updated.data.assignee }
            : iss
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error assigning issue");
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("");
    setLevel("");
    setEnvFilter("");
    setReleaseFilter("");
    setAssigneeFilter("");
    setCurrentCursor(null);
    setCursorHistory([]);
  };

  // Bulk Actions Handlers
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIssueIds.length === 0) return;
    setIsBulkActionRunning(true);
    try {
      const res = await fetch("/api/v1/issues/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueIds: selectedIssueIds,
          status: newStatus,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Bulk status update failed");
      }
      // Optimistic updates
      setIssues((prev) =>
        prev.map((iss) =>
          selectedIssueIds.includes(iss.id)
            ? { ...iss, status: newStatus as "UNRESOLVED" | "RESOLVED" | "REOPENED" | "IGNORED" }
            : iss
        )
      );
      setSelectedIssueIds([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk status change error");
    } finally {
      setIsBulkActionRunning(false);
    }
  };

  const handleBulkAssign = async (userId: string | null) => {
    if (selectedIssueIds.length === 0) return;
    setIsBulkActionRunning(true);
    try {
      const res = await fetch("/api/v1/issues/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueIds: selectedIssueIds,
          assigneeUserId: userId,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Bulk assignment failed");
      }
      const matchedMember = userId ? members.find((m) => m.id === userId) : null;
      setIssues((prev) =>
        prev.map((iss) =>
          selectedIssueIds.includes(iss.id)
            ? {
                ...iss,
                assigneeUserId: userId,
                assignee: matchedMember
                  ? {
                      id: userId!,
                      displayName: matchedMember.displayName,
                      email: matchedMember.email,
                    }
                  : null,
              }
            : iss
        )
      );
      setSelectedIssueIds([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk assign error");
    } finally {
      setIsBulkActionRunning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIssueIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete these ${selectedIssueIds.length} issues?`))
      return;
    setIsBulkActionRunning(true);
    try {
      const res = await fetch("/api/v1/issues/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueIds: selectedIssueIds,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Bulk delete failed");
      }
      setIssues((prev) => prev.filter((iss) => !selectedIssueIds.includes(iss.id)));
      setSelectedIssueIds([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk delete error");
    } finally {
      setIsBulkActionRunning(false);
    }
  };

  // Selection toggles
  const isAllSelected = issues.length > 0 && selectedIssueIds.length === issues.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIssueIds([]);
    } else {
      setSelectedIssueIds(issues.map((i) => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIssueIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Saved Filters functions
  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return;
    const filterObj: SavedFilter = {
      id: crypto.randomUUID(),
      name: newFilterName.trim(),
      search,
      status,
      level,
      envFilter,
      releaseFilter,
      assigneeFilter,
      sortField,
      sortDirection,
    };
    const updated = [...savedFilters, filterObj];
    setSavedFilters(updated);
    localStorage.setItem(`errornest:saved-filters:${project.id}`, JSON.stringify(updated));
    setNewFilterName("");
    setShowSaveModal(false);
  };

  const handleApplyFilter = (f: SavedFilter) => {
    setSearch(f.search);
    setDebouncedSearch(f.search);
    setStatus(f.status);
    setLevel(f.level);
    setEnvFilter(f.envFilter);
    setReleaseFilter(f.releaseFilter);
    setAssigneeFilter(f.assigneeFilter);
    setSortField(f.sortField);
    setSortDirection(f.sortDirection);
    setCurrentCursor(null);
    setCursorHistory([]);
  };

  const handleDeleteFilter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(`errornest:saved-filters:${project.id}`, JSON.stringify(updated));
  };

  const getLevelBadgeColor = (lvl: string) => {
    switch (lvl) {
      case "FATAL":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      case "ERROR":
        return "bg-red-500/10 border-red-500/30 text-red-400";
      case "WARNING":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "INFO":
        return "bg-sky-500/10 border-sky-500/30 text-sky-400";
      default:
        return "bg-zinc-500/10 border-zinc-500/30 text-zinc-400";
    }
  };

  const getStatusBadgeColor = (stat: string) => {
    switch (stat) {
      case "RESOLVED":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "IGNORED":
        return "bg-zinc-500/20 border-zinc-700/60 text-zinc-400";
      case "REOPENED":
        return "bg-rose-500/15 border-rose-500/40 text-rose-400";
      default:
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
    }
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="space-y-6 relative pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href={`/app/${org.slug}/projects`} className="transition-colors hover:text-slate-200">
            Projects
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <Link
            href={`/app/${org.slug}/projects/${project.slug}`}
            className="font-medium text-slate-300 transition-colors hover:text-slate-200"
          >
            {project.name}
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <span className="font-semibold text-slate-100">Issues</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="rounded-2xl border border-white/10 bg-white/10 p-1.5 text-slate-400 transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
          title="Refresh Issues"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(13,20,42,0.95),rgba(8,13,26,0.92))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
              <Sparkles className="h-3.5 w-3.5" />
              Triage workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Issues</h1>
            <p className="mt-2 text-sm text-slate-400">
              Review severity, status, and AI-guided context without leaving the flow of work.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search issues"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none placeholder-slate-500 focus:border-primary/40"
              />
            </div>
            <button
              onClick={() => setShowSaveModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3.5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/15"
            >
              <Bookmark className="h-4 w-4" />
              Save filters
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Open", value: "24", tone: "text-primary" },
          { label: "Needs follow-up", value: "6", tone: "text-amber-400" },
          { label: "Resolved", value: "118", tone: "text-emerald-400" },
        ].map((item) => (
          <div key={item.label} className="rounded-[24px] border border-white/10 bg-[rgba(8,13,27,0.92)] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.16)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {item.label}
            </div>
            <div className={`mt-2 text-2xl font-semibold ${item.tone}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Main Grid: Left Filters, Right Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="h-fit rounded-[28px] border border-white/10 bg-[rgba(8,13,27,0.92)] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)] lg:col-span-1">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <Filter className="h-4 w-4 text-primary" /> Filters
            </span>
            <div className="flex items-center gap-2">
              {(status || level || envFilter || releaseFilter || assigneeFilter || search) && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-rose-400"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
          </div>

          {savedFilters.length > 0 && (
            <div className="space-y-1.5 border-b border-white/10 pb-3 pt-3">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Saved Filters
              </label>
              <div className="space-y-1">
                {savedFilters.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => handleApplyFilter(f)}
                    className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-2.5 py-1.5 transition-all hover:bg-white/10"
                  >
                    <span className="max-w-[130px] truncate text-xs font-semibold text-slate-300 transition-colors group-hover:text-primary">
                      {f.name}
                    </span>
                    <button
                      onClick={(e) => handleDeleteFilter(f.id, e)}
                      className="rounded p-0.5 text-slate-500 opacity-0 transition-colors hover:text-rose-400 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5 pt-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search issues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors focus:border-primary/40"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-primary/40"
            >
              <option value="">All Statuses</option>
              <option value="UNRESOLVED">Unresolved</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REOPENED">Reopened</option>
              <option value="IGNORED">Ignored</option>
            </select>
          </div>

          <div className="space-y-1.5 pt-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Severity Level
            </label>
            <select
              value={level}
              onChange={(e) => handleFilterChange(setLevel, e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-primary/40"
            >
              <option value="">All Severities</option>
              <option value="FATAL">Fatal</option>
              <option value="ERROR">Error</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <div className="space-y-1.5 pt-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Environment
            </label>
            <select
              value={envFilter}
              onChange={(e) => handleFilterChange(setEnvFilter, e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-primary/40"
            >
              <option value="">All Environments</option>
              {environments.map((env) => (
                <option key={env.id} value={env.name}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 pt-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Release
            </label>
            <select
              value={releaseFilter}
              onChange={(e) => handleFilterChange(setReleaseFilter, e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-primary/40"
            >
              <option value="">All Releases</option>
              {releases.map((rel) => (
                <option key={rel.id} value={rel.version}>
                  {rel.version}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 pt-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Assignee
            </label>
            <select
              value={assigneeFilter}
              onChange={(e) => handleFilterChange(setAssigneeFilter, e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-primary/40"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 border-t border-white/10 pt-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Sort By
              </label>
              <select
                value={sortField}
                onChange={(e) =>
                  setSortField(e.target.value as "lastSeenAt" | "occurrenceCount" | "firstSeenAt")
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-primary/40"
              >
                <option value="lastSeenAt">Last Seen</option>
                <option value="occurrenceCount">Occurrence Count</option>
                <option value="firstSeenAt">First Seen</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Direction
              </label>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as "asc" | "desc")}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-primary/40"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Issues List Table */}
        <div className="flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(8,13,27,0.92)] shadow-[0_20px_70px_rgba(0,0,0,0.22)] lg:col-span-3">
          <div className="overflow-x-auto">
            {isLoading ? (
              // Loading skeletons
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 w-full animate-pulse rounded-2xl border border-white/10 bg-white/5"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="space-y-3 p-12 text-center text-red-400">
                <AlertTriangle className="mx-auto h-10 w-10" />
                <h3 className="font-semibold text-white">Failed to load issues</h3>
                <p className="text-xs text-slate-500">{error}</p>
                <button
                  onClick={fetchIssues}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/15"
                >
                  Retry
                </button>
              </div>
            ) : issues.length === 0 ? (
              <div className="space-y-4 p-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-slate-300">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <h3 className="text-base font-semibold text-white">No issues found</h3>
                <p className="mx-auto max-w-sm text-xs text-slate-500">
                  {debouncedSearch ||
                  status ||
                  level ||
                  envFilter ||
                  releaseFilter ||
                  assigneeFilter
                    ? "No issues match the active filter criteria. Try adjusting filters or searching another keyword."
                    : "No exceptions captured yet for this project. Configure the SDK and throw an error to see it here!"}
                </p>
                {debouncedSearch ||
                status ||
                level ||
                envFilter ||
                releaseFilter ||
                assigneeFilter ? (
                  <button
                    onClick={handleResetFilters}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/15"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <Link
                    href={`/app/${org.slug}/projects/${project.slug}/sdk-setup`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" /> Setup Instructions
                  </Link>
                )}
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-950/70 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-zinc-800 text-emerald-600 bg-zinc-950 accent-emerald-500 h-3.5 w-3.5 cursor-pointer"
                      />
                    </th>
                    <th className="p-4 w-24">Severity</th>
                    <th className="p-4 w-28">Status</th>
                    <th className="p-4">Title</th>
                    <th className="p-4 w-24 text-right">Occurrences</th>
                    <th className="p-4 w-32">Last Seen</th>
                    <th className="p-4 w-28">Assignee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {issues.map((issue) => {
                    const isSelected = selectedIssueIds.includes(issue.id);
                    return (
                      <tr
                        key={issue.id}
                        className={`group transition-colors hover:bg-white/5 ${
                          isSelected ? "bg-primary/10 hover:bg-primary/15" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(issue.id)}
                            className="rounded border-zinc-800 text-emerald-600 bg-zinc-950 accent-emerald-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>

                        {/* Severity */}
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide uppercase ${getLevelBadgeColor(
                              issue.level
                            )}`}
                          >
                            {issue.level}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <select
                            value={issue.status}
                            onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                            className={`bg-zinc-950/80 border border-zinc-800/80 rounded px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer outline-none focus:border-emerald-500 ${getStatusBadgeColor(
                              issue.status
                            )}`}
                          >
                            <option value="UNRESOLVED">Unresolved</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="REOPENED">Reopened</option>
                            <option value="IGNORED">Ignored</option>
                          </select>
                        </td>

                        {/* Title */}
                        <td className="p-4">
                          <div className="flex flex-col gap-0.5 max-w-md">
                            <Link
                              href={`/app/${org.slug}/projects/${project.slug}/issues/${issue.id}`}
                              className="truncate text-[13px] font-semibold text-white transition-colors hover:text-primary"
                            >
                              {issue.title}
                            </Link>
                            <span className="text-[10px] text-zinc-500 font-mono truncate">
                              {issue.errorType} — {issue.normalizedMessage}
                            </span>
                          </div>
                        </td>

                        {/* Occurrences */}
                        <td className="p-4 text-right font-mono font-bold text-zinc-200">
                          {issue.occurrenceCount.toLocaleString()}
                        </td>

                        {/* Last Seen */}
                        <td className="p-4 text-zinc-400 font-medium">
                          {getRelativeTime(issue.lastSeenAt)}
                        </td>

                        {/* Assignee */}
                        <td className="p-4">
                          <select
                            value={issue.assigneeUserId || ""}
                            onChange={(e) => handleAssigneeChange(issue.id, e.target.value || null)}
                            className="w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-300 outline-none transition-colors focus:border-primary/40"
                          >
                            <option value="">Unassigned</option>
                            {members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.displayName}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/20 p-4">
            <span className="text-[11px] text-slate-500">
              Showing {issues.length} issue{issues.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={cursorHistory.length === 0 || isLoading}
                className="flex cursor-pointer items-center gap-1 rounded-2xl border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <button
                onClick={handleNextPage}
                disabled={!hasMore || isLoading}
                className="flex cursor-pointer items-center gap-1 rounded-2xl border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Glassmorphic Bulk Action Toolbar */}
      {selectedIssueIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-full border border-white/10 bg-slate-950/80 px-6 py-3 text-xs shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 pr-4 border-r border-zinc-800 font-bold text-white">
            <CheckCircle className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>{selectedIssueIds.length} Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange("RESOLVED")}
              disabled={isBulkActionRunning}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              Resolve
            </button>

            <button
              onClick={() => handleBulkStatusChange("IGNORED")}
              disabled={isBulkActionRunning}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <EyeOff className="h-3.5 w-3.5" /> Ignore
            </button>

            {/* Assign drop-down */}
            <div className="relative group">
              <button
                disabled={isBulkActionRunning}
                className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 disabled:opacity-50 text-zinc-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <UserCheck className="h-3.5 w-3.5" /> Assign
              </button>
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl py-1 hidden group-hover:block hover:block z-50 text-xs">
                <button
                  onClick={() => handleBulkAssign(null)}
                  className="w-full text-left px-3 py-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                >
                  Unassign
                </button>
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleBulkAssign(m.id)}
                    className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  >
                    {m.displayName}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleBulkDelete}
              disabled={isBulkActionRunning}
              className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-900/40 disabled:opacity-50 text-rose-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>

          <button
            onClick={() => setSelectedIssueIds([])}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Save Filter Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-white">Save Current Filters</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Store the currently active search query and filtering configuration.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Filter Name
              </label>
              <input
                type="text"
                placeholder="e.g., Unresolved Production Errors"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!newFilterName.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Save Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
