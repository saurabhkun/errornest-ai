/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ArrowLeft,
  Activity,
  Code,
  User,
  Users,
  CheckCircle,
  EyeOff,
  AlertOctagon,
  MessageSquare,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Member {
  id: string;
  displayName: string;
  email: string;
}

interface IssueDetailClientProps {
  org: {
    id: string;
    slug: string;
  };
  project: {
    id: string;
    name: string;
    slug: string;
  };
  issueId: string;
  members: Member[];
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
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  assignee?: Member | null;
}

interface StackFrame {
  fileName?: string;
  functionName?: string;
  lineNumber?: number;
  columnNumber?: number;
  inApp?: boolean;
}

interface Event {
  id: string;
  message: string;
  errorType: string;
  level: string;
  rawStackTrace: string | null;
  normalizedFrames: StackFrame[];
  userExternalId: string | null;
  userContext: Record<string, unknown> | null;
  tags: Record<string, string>;
  rawPayload: Record<string, unknown> | null;
  serverReceivedAt: string;
  environment: {
    name: string;
  };
  release: {
    version: string;
  } | null;
}

interface ActivityEntry {
  id: string;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: string;
    displayName: string;
    email: string;
  } | null;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: {
    displayName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export function IssueDetailClient({
  org,
  project,
  issueId,
  members,
}: IssueDetailClientProps) {
  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "occurrences" | "tags" | "context">(
    "overview"
  );

  // Data States
  const [issue, setIssue] = useState<Issue | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [rawJsonExpanded, setRawJsonExpanded] = useState(false);

  // Latest event helper
  const latestEvent = events[0] || null;

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Issue Detail
      const issueRes = await fetch(`/api/v1/issues/${issueId}`);
      if (!issueRes.ok) throw new Error("Issue not found");
      const issueData = await issueRes.json();
      setIssue(issueData.data);

      // 2. Fetch Events
      const eventsRes = await fetch(`/api/v1/issues/${issueId}/events`);
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data || []);
      }

      // 3. Fetch Activities
      const activitiesRes = await fetch(`/api/v1/issues/${issueId}/activity`);
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData.data || []);
      }

      // 4. Fetch Comments
      const commentsRes = await fetch(`/api/v1/issues/${issueId}/comments`);
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle Status Update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!issue) return;
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
      const updated = await res.json();
      setIssue(updated.data);
      // Refresh activities list
      const activitiesRes = await fetch(`/api/v1/issues/${issueId}/activity`);
      if (activitiesRes.ok) {
        const actData = await activitiesRes.json();
        setActivities(actData.data || []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating status");
    }
  };

  // Handle Assignment Update
  const handleAssigneeUpdate = async (userId: string | null) => {
    if (!issue) return;
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
      setIssue((prev) =>
        prev ? { ...prev, assigneeUserId: userId, assignee: updated.data.assignee } : null
      );
      // Refresh activities list
      const activitiesRes = await fetch(`/api/v1/issues/${issueId}/activity`);
      if (activitiesRes.ok) {
        const actData = await activitiesRes.json();
        setActivities(actData.data || []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating assignee");
    }
  };

  // Handle Comment Submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);

    try {
      const res = await fetch(`/api/v1/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newCommentBody }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to submit comment");
      }

      const newComment = await res.json();
      setComments((prev) => [...prev, newComment.data]);
      setNewCommentBody("");

      // Refresh activities list
      const activitiesRes = await fetch(`/api/v1/issues/${issueId}/activity`);
      if (activitiesRes.ok) {
        const actData = await activitiesRes.json();
        setActivities(actData.data || []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error submitting comment");
    } finally {
      setIsSubmittingComment(false);
    }
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

  const getStatusLabel = (stat: string) => {
    switch (stat) {
      case "RESOLVED":
        return "Resolved";
      case "IGNORED":
        return "Ignored";
      case "REOPENED":
        return "Reopened";
      default:
        return "Unresolved";
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

  // Stack Frame Filter Helper
  const isFrameInApp = (fileName: string) => {
    const file = (fileName || "").toLowerCase();
    return (
      file &&
      !file.includes("node_modules") &&
      !file.includes("next/dist") &&
      !file.includes("next/server") &&
      !file.includes("node:internal") &&
      !file.includes("webpack-internal")
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-zinc-900 rounded animate-pulse" />
        <div className="h-24 w-full bg-zinc-900 rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-3 h-96 bg-zinc-900 rounded-xl animate-pulse" />
          <div className="col-span-1 h-96 bg-zinc-900 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="p-12 text-center border border-zinc-800 bg-zinc-900/40 rounded-xl space-y-4">
        <AlertOctagon className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Issue Not Found</h2>
        <p className="text-sm text-zinc-400">
          The requested issue does not exist or has been permanently deleted.
        </p>
        <Link
          href={`/app/${org.slug}/projects/${project.slug}/issues`}
          className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
        >
          <ArrowLeft className="h-4.5 w-4.5" /> Back to Issues
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <Link
          href={`/app/${org.slug}/projects/${project.slug}/issues`}
          className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors py-1 px-2.5 rounded border border-zinc-800 bg-zinc-900/60 font-semibold text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Issues
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
        <span className="text-zinc-500">Issue Details</span>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
        <span className="text-zinc-200 font-mono truncate max-w-xs">{issue.id}</span>
      </div>

      {/* Main Header Card */}
      <div className="border border-zinc-850 bg-zinc-900/35 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded border text-[9px] font-extrabold tracking-wide uppercase ${getLevelBadgeColor(
                  issue.level
                )}`}
              >
                {issue.level}
              </span>
              <span
                className={`px-2 py-0.5 rounded border text-[9px] font-extrabold tracking-wide uppercase bg-zinc-950/80 border-zinc-800 text-zinc-400`}
              >
                {getStatusLabel(issue.status)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
              {issue.title}
            </h1>
            <p className="text-xs font-mono text-zinc-400 break-all bg-zinc-950/65 px-3 py-1.5 rounded border border-zinc-900">
              {issue.errorType} — {issue.normalizedMessage}
            </p>
          </div>
        </div>

        {/* Top Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 pt-3 border-t border-zinc-850/65 text-xs">
          <div>
            <div className="text-zinc-500 font-medium mb-0.5">Occurrences</div>
            <div className="text-white font-mono font-bold text-base">
              {issue.occurrenceCount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 font-medium mb-0.5">Users Affected</div>
            <div className="text-white font-mono font-bold text-base">
              {issue.affectedUserCount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 font-medium mb-0.5">First Seen</div>
            <div className="text-zinc-300 font-semibold">{getRelativeTime(issue.firstSeenAt)}</div>
          </div>
          <div>
            <div className="text-zinc-500 font-medium mb-0.5">Last Seen</div>
            <div className="text-zinc-300 font-semibold">{getRelativeTime(issue.lastSeenAt)}</div>
          </div>
          {latestEvent?.environment && (
            <div>
              <div className="text-zinc-500 font-medium mb-0.5">Environment</div>
              <div className="inline-block px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 font-mono text-[10px] font-semibold border border-zinc-850">
                {latestEvent.environment.name}
              </div>
            </div>
          )}
          {latestEvent?.release && (
            <div>
              <div className="text-zinc-500 font-medium mb-0.5">Release</div>
              <div className="inline-block px-1.5 py-0.5 rounded bg-zinc-950 text-emerald-400 font-mono text-[10px] font-semibold border border-zinc-850">
                {latestEvent.release.version}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid split: Left Details Tabs, Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tabbed Panels */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs header */}
          <div className="border-b border-zinc-800 flex gap-6 text-sm">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-3 font-semibold transition-all relative ${
                activeTab === "overview"
                  ? "text-emerald-400 border-b-2 border-emerald-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("occurrences")}
              className={`pb-3 font-semibold transition-all relative ${
                activeTab === "occurrences"
                  ? "text-emerald-400 border-b-2 border-emerald-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Occurrences ({events.length})
            </button>
            <button
              onClick={() => setActiveTab("tags")}
              className={`pb-3 font-semibold transition-all relative ${
                activeTab === "tags"
                  ? "text-emerald-400 border-b-2 border-emerald-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Tags
            </button>
            <button
              onClick={() => setActiveTab("context")}
              className={`pb-3 font-semibold transition-all relative ${
                activeTab === "context"
                  ? "text-emerald-400 border-b-2 border-emerald-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Context
            </button>
          </div>

          {/* OVERVIEW PANEL: STACK TRACE */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="border border-zinc-800 bg-zinc-900/35 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-500" /> Stack Trace
                  </h3>
                  <span className="text-[10px] text-zinc-500">Showing top frames</span>
                </div>

                {!latestEvent || latestEvent.normalizedFrames.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs italic">
                    No stack trace frames captured for this event.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {latestEvent.normalizedFrames.map((frame, index) => {
                      const isApp = isFrameInApp(frame.fileName || "");
                      return (
                        <div
                          key={index}
                          className={`flex items-start gap-4 p-3 rounded-lg border text-xs font-mono transition-colors ${
                            isApp
                              ? "bg-zinc-950 border-zinc-800/80 hover:bg-zinc-950/80"
                              : "bg-zinc-900/20 border-zinc-900/40 text-zinc-500 hover:bg-zinc-900/35"
                          }`}
                        >
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isApp ? "text-emerald-400" : "text-zinc-400"}`}>
                                {frame.functionName || "anonymous"}
                              </span>
                              {isApp && (
                                <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 text-[9px] px-1 rounded font-bold uppercase scale-90">
                                  in-app
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500 truncate select-all">
                              {frame.fileName || "unknown file"}
                            </span>
                          </div>
                          {(frame.lineNumber || frame.columnNumber) && (
                            <div className="text-zinc-400 shrink-0 font-semibold bg-zinc-900/80 px-2 py-1 rounded border border-zinc-850 text-[11px]">
                              line {frame.lineNumber || "?"}
                              {frame.columnNumber && `:${frame.columnNumber}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OCCURRENCES PANEL */}
          {activeTab === "occurrences" && (
            <div className="border border-zinc-800 bg-zinc-900/35 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 bg-zinc-950/20">
                <h3 className="text-xs font-bold text-white">Event Occurrences timeline</h3>
              </div>
              <div className="divide-y divide-zinc-850">
                {events.map((evt) => (
                  <div key={evt.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="font-mono text-zinc-400">{evt.id}</span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-500 border border-zinc-900 text-[10px]">
                          {evt.environment.name}
                        </span>
                      </div>
                      <p className="text-zinc-400 truncate max-w-lg">{evt.message}</p>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-500">
                      {evt.release && (
                        <span className="font-mono text-[10px] bg-zinc-950 border border-zinc-850 px-1.5 py-0.5 rounded text-emerald-400">
                          {evt.release.version}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(evt.serverReceivedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAGS PANEL */}
          {activeTab === "tags" && (
            <div className="border border-zinc-800 bg-zinc-900/35 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-zinc-850 pb-2">
                Latest Event Tags
              </h3>
              {!latestEvent || !latestEvent.tags || Object.keys(latestEvent.tags).length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs italic">
                  No tags associated with this event.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(latestEvent.tags).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-950/60 font-mono text-xs"
                    >
                      <span className="text-zinc-500 font-bold">{key}</span>
                      <span className="text-emerald-400 font-semibold truncate max-w-[180px]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTEXT PANEL */}
          {activeTab === "context" && (
            <div className="space-y-6">
              {/* User Context */}
              <div className="border border-zinc-800 bg-zinc-900/35 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white border-b border-zinc-850 pb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-500" /> User Context
                </h3>
                {latestEvent && latestEvent.userExternalId ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900">
                      <span className="block text-zinc-500 font-bold text-[10px] uppercase mb-1">
                        User External ID
                      </span>
                      <span className="text-zinc-200">{latestEvent.userExternalId}</span>
                    </div>
                    {latestEvent.userContext &&
                      Object.entries(latestEvent.userContext).map(([key, val]) => (
                        <div
                          key={key}
                          className="p-3 bg-zinc-950 rounded-lg border border-zinc-900"
                        >
                          <span className="block text-zinc-500 font-bold text-[10px] uppercase mb-1">
                            {key}
                          </span>
                          <span className="text-zinc-200">{String(val)}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-zinc-500 text-xs italic">
                    No user context was provided with this event.
                  </div>
                )}
              </div>

              {/* Raw Payload JSON */}
              <div className="border border-zinc-800 bg-zinc-900/35 rounded-xl p-5 space-y-4">
                <button
                  onClick={() => setRawJsonExpanded(!rawJsonExpanded)}
                  className="w-full flex items-center justify-between text-sm font-bold text-white border-b border-zinc-850 pb-2 cursor-pointer focus:outline-none"
                >
                  <span className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-emerald-500" /> Raw JSON Payload
                  </span>
                  {rawJsonExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {rawJsonExpanded && latestEvent && (
                  <pre className="p-4 rounded-lg bg-zinc-950 border border-zinc-850 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-96 leading-relaxed select-all">
                    {JSON.stringify(latestEvent.rawPayload, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Triage Actions, Comments, Activity */}
        <div className="lg:col-span-1 space-y-6">
          {/* Triage Actions Box */}
          <div className="border border-zinc-850 bg-zinc-900/35 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-zinc-850 pb-2">
              Triage Issue
            </h3>

            {/* Status transitions */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Status Action
              </label>
              <div className="grid grid-cols-2 gap-2">
                {issue.status !== "RESOLVED" ? (
                  <button
                    onClick={() => handleStatusUpdate("RESOLVED")}
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" /> Resolve
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusUpdate("REOPENED")}
                    className="flex items-center justify-center gap-1.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-white font-semibold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer"
                  >
                    <Activity className="h-4 w-4" /> Reopen
                  </button>
                )}
                {issue.status !== "IGNORED" ? (
                  <button
                    onClick={() => handleStatusUpdate("IGNORED")}
                    className="flex items-center justify-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer"
                  >
                    <EyeOff className="h-4 w-4" /> Ignore
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusUpdate("UNRESOLVED")}
                    className="flex items-center justify-center gap-1.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer"
                  >
                    <AlertOctagon className="h-4 w-4" /> Unignore
                  </button>
                )}
              </div>
            </div>

            {/* Assignee Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Assignee
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <select
                  value={issue.assigneeUserId || ""}
                  onChange={(e) => handleAssigneeUpdate(e.target.value || null)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="border border-zinc-850 bg-zinc-900/35 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-zinc-850 pb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-500" /> Discussion
            </h3>

            {/* Comments List */}
            <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-center text-zinc-600 text-xs italic py-4">
                  No comments yet. Start the conversation!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="font-bold text-zinc-300">
                        {comment.author.displayName}
                      </span>
                      <span>{getRelativeTime(comment.createdAt)}</span>
                    </div>
                    <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-lg text-zinc-300 leading-normal break-words">
                      {comment.body}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Form */}
            <form onSubmit={handleCommentSubmit} className="space-y-2">
              <textarea
                placeholder="Add a comment..."
                value={newCommentBody}
                onChange={(e) => setNewCommentBody(e.target.value)}
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
              <button
                type="submit"
                disabled={!newCommentBody.trim() || isSubmittingComment}
                className="w-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-755 hover:text-white disabled:opacity-50 text-zinc-300 font-semibold text-xs py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                {isSubmittingComment ? "Posting..." : "Post Comment"}
              </button>
            </form>
          </div>

          {/* Activity timeline feed */}
          <div className="border border-zinc-850 bg-zinc-900/35 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-zinc-850 pb-2">
              Activity History
            </h3>

            <div className="relative pl-4 border-l border-zinc-800 space-y-4 max-h-64 overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <div className="text-zinc-600 text-xs italic">No activity logged yet.</div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="relative text-xs">
                    {/* Circle marker */}
                    <span className="absolute -left-[20.5px] top-0.5 h-2 w-2 rounded-full bg-zinc-700 border border-zinc-950" />

                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="font-semibold text-zinc-300">
                        {act.actor?.displayName || "System"}
                      </span>
                      <span>{getRelativeTime(act.createdAt)}</span>
                    </div>

                    <p className="text-zinc-400 font-medium mt-0.5">
                      {act.type === "CREATED" && "created this issue"}
                      {act.type === "RESOLVED" && "resolved this issue"}
                      {act.type === "REOPENED" && "reopened this issue (regression detected)"}
                      {act.type === "IGNORED" && "ignored this issue"}
                      {act.type === "UNRESOLVED" && "unignored this issue"}
                      {act.type === "ASSIGNED" && (
                        <>
                          assigned to{" "}
                          <span className="text-zinc-300 font-semibold">
                            {String(act.metadata?.assigneeName || "Unassigned")}
                          </span>
                        </>
                      )}
                      {act.type === "COMMENTED" && (
                        <>
                          commented:{" "}
                          <span className="text-zinc-400 italic">
                            &ldquo;{String(act.metadata?.bodySnippet || "")}&rdquo;
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
