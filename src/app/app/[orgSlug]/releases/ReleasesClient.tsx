"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Calendar,
  GitCommit,
  Plus,
  Trash2,
  ChevronRight,
  Eye,
  GitCompare,
  X,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface Release {
  id: string;
  version: string;
  commitSha: string | null;
  deployedAt: string;
  createdAt: string;
}

interface ReleaseMetrics {
  eventCount: number;
  newIssueCount: number;
  affectedUserCount: number;
  regressionsCount: number;
  errorRate: number;
  uniqueIssuesCount: number;
}

interface Issue {
  id: string;
  title: string;
  errorType: string;
  status: string;
  level: string;
  lastSeenAt: string;
}

interface ReleaseDetails {
  release: Release;
  metrics: ReleaseMetrics;
  issues: Issue[];
}

interface ComparisonData {
  currentRelease: Release;
  comparisonRelease: Release | null;
  metrics: {
    current: {
      eventCount: number;
      newIssueCount: number;
      affectedUserCount: number;
      regressionsCount: number;
    };
    comparison: {
      eventCount: number;
      newIssueCount: number;
      affectedUserCount: number;
      regressionsCount: number;
    } | null;
    deltas: {
      eventCount: number;
      newIssueCount: number;
      affectedUserCount: number;
      regressionsCount: number;
    };
  };
  newIssues: Issue[];
}

interface ReleasesClientProps {
  org: {
    id: string;
    name: string;
    slug: string;
  };
  projects: Project[];
}

export function ReleasesClient({ org, projects }: ReleasesClientProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(
    projects.length > 0 ? projects[0] : null
  );

  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Release Creation Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [newCommitSha, setNewCommitSha] = useState("");
  const [newDeployedAt, setNewDeployedAt] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Release Details Modal State
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [details, setDetails] = useState<ReleaseDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Release Comparison Modal State
  const [compareRelease, setCompareRelease] = useState<Release | null>(null);
  const [compareWithId, setCompareWithId] = useState<string>("");
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Fetch all releases for selected project
  const fetchReleases = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${selectedProject.id}/releases`);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to fetch releases");
      }
      setReleases(body.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchReleases();
    });
  }, [fetchReleases]);

  // Handle Release Creation
  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newVersion.trim()) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch(`/api/v1/projects/${selectedProject.id}/releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: newVersion.trim(),
          commitSha: newCommitSha.trim() || undefined,
          deployedAt: newDeployedAt ? new Date(newDeployedAt).toISOString() : undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to create release");
      }

      setNewVersion("");
      setNewCommitSha("");
      setNewDeployedAt("");
      setIsCreateOpen(false);
      fetchReleases();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create release");
    } finally {
      setCreateLoading(false);
    }
  };

  // Fetch Release Details
  const handleViewDetails = async (release: Release) => {
    setSelectedRelease(release);
    setDetailsLoading(true);
    setDetails(null);

    try {
      const res = await fetch(`/api/v1/projects/${selectedProject?.id}/releases/${release.id}`);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to load release details");
      }
      setDetails(body.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Fetch Comparison
  const handleCompare = async (release: Release, withId?: string) => {
    setCompareRelease(release);
    setCompareLoading(true);
    setComparison(null);

    const targetId = withId || "";
    setCompareWithId(targetId);

    try {
      const query = targetId ? `?withReleaseId=${targetId}` : "";
      const res = await fetch(
        `/api/v1/projects/${selectedProject?.id}/releases/${release.id}/compare${query}`
      );
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to load comparison data");
      }
      setComparison(body.data);
      if (body.data.comparisonRelease) {
        setCompareWithId(body.data.comparisonRelease.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCompareLoading(false);
    }
  };

  // Delete Release
  const handleDeleteRelease = async (releaseId: string) => {
    if (!confirm("Are you sure you want to permanently delete this release record?")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/projects/${selectedProject?.id}/releases/${releaseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to delete release");
      }

      setReleases(releases.filter((r) => r.id !== releaseId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete release");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href={`/app/${org.slug}/dashboard`} className="hover:text-zinc-200 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3 text-zinc-600" />
        <span className="text-zinc-200 font-medium">Releases</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-zinc-900/10 p-6 border border-zinc-800/40 rounded-2xl backdrop-blur-md">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Layers className="h-8 w-8 text-emerald-500" />
            <span>Releases</span>
          </h1>
          <p className="text-sm text-zinc-400">
            Track release stability, monitor error rates, and compare health metrics between
            deployments.
          </p>
        </div>

        {selectedProject && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl cursor-pointer shadow-lg shadow-emerald-950/20 hover:shadow-emerald-900/30 transition-all border border-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>New Release</span>
          </button>
        )}
      </div>

      {/* Project Selector & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-zinc-400">Project:</label>
          <div className="relative">
            <select
              value={selectedProject?.id || ""}
              onChange={(e) => {
                const proj = projects.find((p) => p.id === e.target.value) || null;
                setSelectedProject(proj);
              }}
              className="appearance-none bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 pr-10 text-sm font-medium text-white hover:border-zinc-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Releases Main Dashboard Card */}
      <div className="border border-zinc-800 bg-zinc-900/35 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-3 text-zinc-400">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
            <span className="text-sm font-medium">Fetching releases...</span>
          </div>
        ) : error ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3 text-red-400">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        ) : releases.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center max-w-md mx-auto">
            <Layers className="h-12 w-12 text-zinc-600 mb-4 animate-bounce" />
            <h3 className="text-base font-bold text-white">No releases discovered</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Register a new release version manually using the button above, or tags will be
              automatically created as they are ingested from your application SDK.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Version</th>
                  <th className="p-4">Commit SHA</th>
                  <th className="p-4">Deployed At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {releases.map((rel) => (
                  <tr key={rel.id} className="hover:bg-zinc-800/10 transition-colors">
                    <td className="p-4 font-bold text-white text-sm">{rel.version}</td>
                    <td className="p-4 font-mono text-zinc-400">
                      {rel.commitSha ? (
                        <div className="flex items-center gap-1">
                          <GitCommit className="h-3.5 w-3.5 text-zinc-500" />
                          <span>{rel.commitSha.slice(0, 8)}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-650">—</span>
                      )}
                    </td>
                    <td className="p-4 text-zinc-450 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                        <span>
                          {new Date(rel.deployedAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2.5">
                      <button
                        onClick={() => handleViewDetails(rel)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:text-white cursor-pointer transition-colors font-medium text-[11px]"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Details</span>
                      </button>
                      <button
                        onClick={() => handleCompare(rel)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:text-white cursor-pointer transition-colors font-medium text-[11px]"
                      >
                        <GitCompare className="h-3 w-3" />
                        <span>Compare</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRelease(rel.id)}
                        className="p-1.5 rounded border border-red-950 hover:border-red-900 bg-red-950/20 text-red-455 hover:text-red-300 cursor-pointer transition-colors"
                        title="Delete Release"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE RELEASE MODAL */}
      {isCreateOpen && (
        <>
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/30">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-500" />
                  <span>Create Project Release</span>
                </h2>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded hover:bg-zinc-800 cursor-pointer"
                  disabled={createLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRelease} className="p-6 space-y-4">
                {createError && (
                  <div className="flex items-start gap-2.5 p-3 bg-red-950/40 border border-red-800/80 rounded-xl text-red-200 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-450">
                    Version Tag (Required)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. v1.2.0, production-105"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-450">
                    Commit SHA (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7f3a8b2c"
                    value={newCommitSha}
                    onChange={(e) => setNewCommitSha(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-450">
                    Deployment Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={newDeployedAt}
                    onChange={(e) => setNewDeployedAt(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-250 hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-905 text-sm font-semibold text-zinc-350 hover:text-white rounded-xl cursor-pointer"
                    disabled={createLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                    disabled={createLoading}
                  >
                    {createLoading ? "Creating..." : "Create Release"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* RELEASE DETAILS MODAL */}
      {selectedRelease && (
        <>
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/30 shrink-0">
                <div className="flex items-center gap-2.5">
                  <Layers className="h-5 w-5 text-emerald-500" />
                  <span className="text-lg font-bold text-white">
                    Release details: {selectedRelease.version}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedRelease(null)}
                  className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {detailsLoading ? (
                <div className="flex-1 p-20 text-center flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
                  <span className="text-sm">Loading stats & associated issues...</span>
                </div>
              ) : details ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Total Events
                      </span>
                      <span className="block text-xl font-black text-white mt-1">
                        {details.metrics.eventCount}
                      </span>
                    </div>
                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Unique Issues
                      </span>
                      <span className="block text-xl font-black text-white mt-1">
                        {details.metrics.uniqueIssuesCount}
                      </span>
                    </div>
                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        New Issues
                      </span>
                      <span className="block text-xl font-black text-white mt-1">
                        {details.metrics.newIssueCount}
                      </span>
                    </div>
                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Regressions
                      </span>
                      <span className="block text-xl font-black text-white mt-1">
                        {details.metrics.regressionsCount}
                      </span>
                    </div>
                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 col-span-2 md:col-span-1">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Error Rate
                      </span>
                      <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold mt-1 bg-emerald-950 text-emerald-400 border border-emerald-900/50">
                        {details.metrics.errorRate}%
                      </span>
                    </div>
                  </div>

                  {/* Issues Table */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Issues Occurred in this Release
                    </h3>
                    {details.issues.length === 0 ? (
                      <div className="p-8 text-center bg-zinc-950/20 border border-zinc-800/40 rounded-xl text-zinc-500 text-xs font-semibold">
                        No events have been reported for this release.
                      </div>
                    ) : (
                      <div className="border border-zinc-850 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs text-zinc-300">
                          <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-bold uppercase tracking-wider">
                              <th className="p-3">Issue</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850">
                            {details.issues.map((issue) => (
                              <tr key={issue.id} className="hover:bg-zinc-800/10">
                                <td className="p-3 max-w-md truncate">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mr-2 ${
                                      issue.level === "fatal"
                                        ? "bg-red-950 text-red-400 border border-red-900/50"
                                        : issue.level === "warning"
                                          ? "bg-amber-950 text-amber-400 border border-amber-900/50"
                                          : "bg-zinc-800 text-zinc-300"
                                    }`}
                                  >
                                    {issue.level}
                                  </span>
                                  <span className="font-bold text-white">{issue.title}</span>
                                  <span className="block text-[10px] text-zinc-500 mt-0.5">
                                    {issue.errorType}
                                  </span>
                                </td>
                                <td className="p-3 uppercase font-semibold text-zinc-400">
                                  {issue.status.toLowerCase()}
                                </td>
                                <td className="p-3 text-right">
                                  <Link
                                    href={`/app/${org.slug}/projects/${selectedProject?.slug}/issues/${issue.id}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-emerald-450 hover:text-emerald-300 font-semibold transition-colors"
                                  >
                                    <span>Triage</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/30 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedRelease(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-white rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* COMPARE RELEASES MODAL */}
      {compareRelease && (
        <>
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/30 shrink-0">
                <div className="flex items-center gap-2.5">
                  <GitCompare className="h-5 w-5 text-emerald-500" />
                  <span className="text-lg font-bold text-white">Compare Releases</span>
                </div>
                <button
                  onClick={() => setCompareRelease(null)}
                  className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/10 flex flex-wrap items-center gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white bg-emerald-950/30 border border-emerald-900/60 px-2.5 py-1 rounded-lg">
                    {compareRelease.version}
                  </span>
                  <span className="text-xs text-zinc-500 font-bold uppercase">vs</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-zinc-400">Compare with:</label>
                  <div className="relative">
                    <select
                      value={compareWithId}
                      onChange={(e) => handleCompare(compareRelease, e.target.value)}
                      className="appearance-none bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-white hover:border-zinc-700 cursor-pointer focus:outline-none"
                    >
                      <option value="">(Select previous release)</option>
                      {releases
                        .filter((r) => r.id !== compareRelease.id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.version}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {compareLoading ? (
                <div className="flex-1 p-20 text-center flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
                  <span className="text-sm">Calculating diff and delta metrics...</span>
                </div>
              ) : comparison ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Delta Cards Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Event Count Delta
                      </span>
                      <span
                        className={`block text-xl font-black mt-1 ${
                          comparison.metrics.deltas.eventCount > 0
                            ? "text-rose-400"
                            : comparison.metrics.deltas.eventCount < 0
                              ? "text-emerald-400"
                              : "text-zinc-300"
                        }`}
                      >
                        {comparison.metrics.deltas.eventCount > 0 ? "+" : ""}
                        {comparison.metrics.deltas.eventCount}
                      </span>
                    </div>

                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        New Issues Delta
                      </span>
                      <span
                        className={`block text-xl font-black mt-1 ${
                          comparison.metrics.deltas.newIssueCount > 0
                            ? "text-rose-400"
                            : comparison.metrics.deltas.newIssueCount < 0
                              ? "text-emerald-400"
                              : "text-zinc-300"
                        }`}
                      >
                        {comparison.metrics.deltas.newIssueCount > 0 ? "+" : ""}
                        {comparison.metrics.deltas.newIssueCount}
                      </span>
                    </div>

                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Affected Users Delta
                      </span>
                      <span
                        className={`block text-xl font-black mt-1 ${
                          comparison.metrics.deltas.affectedUserCount > 0
                            ? "text-rose-400"
                            : comparison.metrics.deltas.affectedUserCount < 0
                              ? "text-emerald-400"
                              : "text-zinc-300"
                        }`}
                      >
                        {comparison.metrics.deltas.affectedUserCount > 0 ? "+" : ""}
                        {comparison.metrics.deltas.affectedUserCount}
                      </span>
                    </div>

                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4">
                      <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Regressions Delta
                      </span>
                      <span
                        className={`block text-xl font-black mt-1 ${
                          comparison.metrics.deltas.regressionsCount > 0
                            ? "text-rose-400"
                            : comparison.metrics.deltas.regressionsCount < 0
                              ? "text-emerald-400"
                              : "text-zinc-300"
                        }`}
                      >
                        {comparison.metrics.deltas.regressionsCount > 0 ? "+" : ""}
                        {comparison.metrics.deltas.regressionsCount}
                      </span>
                    </div>
                  </div>

                  {/* New Issues introduced */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        New Issues Introduced in {compareRelease.version}
                      </h3>
                      {comparison.comparisonRelease && (
                        <span className="text-[10px] text-zinc-500 font-medium">
                          (not present in {comparison.comparisonRelease.version})
                        </span>
                      )}
                    </div>

                    {comparison.newIssues.length === 0 ? (
                      <div className="p-8 text-center bg-zinc-950/20 border border-zinc-800/40 rounded-xl text-zinc-500 text-xs font-semibold">
                        No new issues were introduced in this release compared to the selected
                        baseline.
                      </div>
                    ) : (
                      <div className="border border-zinc-850 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs text-zinc-300">
                          <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-bold uppercase tracking-wider">
                              <th className="p-3">Issue</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850">
                            {comparison.newIssues.map((issue) => (
                              <tr key={issue.id} className="hover:bg-zinc-800/10">
                                <td className="p-3 max-w-md truncate">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mr-2 ${
                                      issue.level === "fatal"
                                        ? "bg-red-950 text-red-400 border border-red-900/50"
                                        : issue.level === "warning"
                                          ? "bg-amber-950 text-amber-400 border border-amber-900/50"
                                          : "bg-zinc-800 text-zinc-300"
                                    }`}
                                  >
                                    {issue.level}
                                  </span>
                                  <span className="font-bold text-white">{issue.title}</span>
                                  <span className="block text-[10px] text-zinc-500 mt-0.5">
                                    {issue.errorType}
                                  </span>
                                </td>
                                <td className="p-3 uppercase font-semibold text-zinc-400">
                                  {issue.status.toLowerCase()}
                                </td>
                                <td className="p-3 text-right">
                                  <Link
                                    href={`/app/${org.slug}/projects/${selectedProject?.slug}/issues/${issue.id}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-emerald-450 hover:text-emerald-300 font-semibold transition-colors"
                                  >
                                    <span>Triage</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/30 flex justify-end shrink-0">
                <button
                  onClick={() => setCompareRelease(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-white rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
