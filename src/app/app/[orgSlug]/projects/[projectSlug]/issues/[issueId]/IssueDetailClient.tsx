/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AiPanel } from "@/components/ai/AiPanel";
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
  /* fallback icon for device/request context */
  Cpu,
  Copy,
  Edit2,
  Trash2,
  Check,
  CornerDownRight,
} from "lucide-react";

interface Member {
  id: string;
  displayName: string;
  email: string;
}

interface CurrentUser {
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
  currentUser: CurrentUser;
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
  authorUserId: string;
  author: {
    id: string;
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
  currentUser,
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

  // Interactive Event occurrence Navigation
  const [activeEventIndex, setActiveEventIndex] = useState(0);

  // Stack Trace custom states
  const [collapseLibraryFrames, setCollapseLibraryFrames] = useState(true);
  const [showRawStackTrace, setShowRawStackTrace] = useState(false);
  const [expandedFrameIndex, setExpandedFrameIndex] = useState<number | null>(null);
  const [copiedStack, setCopiedStack] = useState(false);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);

  // Comment Editing States
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");

  // Raw JSON display state
  const [rawJsonExpanded, setRawJsonExpanded] = useState(false);

  // Active event helper
  const activeEvent = events[activeEventIndex] || null;

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

  // Extract Mention User IDs from text
  const extractMentionedUserIds = (text: string) => {
    const ids: string[] = [];
    members.forEach((m) => {
      if (text.includes(`@${m.displayName}`)) {
        ids.push(m.id);
      }
    });
    return ids;
  };

  // Handle Comment Submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);

    try {
      const mentionedUserIds = extractMentionedUserIds(newCommentBody);

      const res = await fetch(`/api/v1/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newCommentBody, mentionedUserIds }),
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

  // Handle Comment Edit
  const handleCommentEdit = async (commentId: string) => {
    if (!editingCommentBody.trim()) return;
    try {
      const mentionedUserIds = extractMentionedUserIds(editingCommentBody);

      const res = await fetch(`/api/v1/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editingCommentBody, mentionedUserIds }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to edit comment");
      }
      const updated = await res.json();
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated.data : c)));
      setEditingCommentId(null);
      setEditingCommentBody("");

      // Refresh activities list
      const activitiesRes = await fetch(`/api/v1/issues/${issueId}/activity`);
      if (activitiesRes.ok) {
        const actData = await activitiesRes.json();
        setActivities(actData.data || []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error editing comment");
    }
  };

  // Handle Comment Delete
  const handleCommentDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await fetch(`/api/v1/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to delete comment");
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      // Refresh activities list
      const activitiesRes = await fetch(`/api/v1/issues/${issueId}/activity`);
      if (activitiesRes.ok) {
        const actData = await activitiesRes.json();
        setActivities(actData.data || []);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting comment");
    }
  };

  // Helper to copy stack trace
  const handleCopyStackTrace = () => {
    if (!activeEvent) return;
    let stackText = "";
    if (showRawStackTrace && activeEvent.rawStackTrace) {
      stackText = activeEvent.rawStackTrace;
    } else {
      stackText = activeEvent.normalizedFrames
        .map(
          (f) =>
            `  at ${f.functionName || "anonymous"} (${f.fileName || "unknown"}:${f.lineNumber || "?"}:${f.columnNumber || "?"})`
        )
        .join("\n");
    }

    navigator.clipboard.writeText(stackText);
    setCopiedStack(true);
    setTimeout(() => setCopiedStack(false), 2000);
  };

  // Helper to parse device & request context from payload
  const getContextDetails = () => {
    if (!activeEvent || !activeEvent.rawPayload) return null;
    const payload = activeEvent.rawPayload;

    // Search common tags/contexts inside raw payload
    const browser =
      (payload.browser as string) ||
      (payload.tags as Record<string, string>)?.browser ||
      "Unknown Browser";
    const os =
      (payload.os as string) || (payload.tags as Record<string, string>)?.os || "Unknown OS";
    const url =
      (payload.url as string) || (payload.tags as Record<string, string>)?.url || "Unknown URL";
    const method =
      (payload.method as string) || (payload.tags as Record<string, string>)?.method || "N/A";
    const ipAddress = (payload.ipAddress as string) || "Unknown IP";
    const userAgent = (payload.userAgent as string) || "Unknown User Agent";
    const sdkVersion =
      (payload.sdkVersion as string) ||
      (payload.tags as Record<string, string>)?.sdkVersion ||
      "Unknown SDK";
    const environment = activeEvent.environment.name;
    const release = activeEvent.release?.version || "No release tag";

    return { browser, os, url, method, ipAddress, userAgent, sdkVersion, environment, release };
  };

  // Mock Source Code Preview context builder
  const getMockSourceCode = (functionName: string, line: number, file: string) => {
    const func = functionName || "anonymous";
    const cleanFile = file.split("/").pop() || "index.js";
    return [
      { line: line - 2, code: `// helper definition inside ${cleanFile}`, isError: false },
      { line: line - 1, code: `function validateAndExecute(payload) {`, isError: false },
      {
        line: line,
        code: `  const response = ${func}(payload); // Error triggered here`,
        isError: true,
      },
      { line: line + 1, code: `  return serializeResponse(response);`, isError: false },
      { line: line + 2, code: `}`, isError: false },
    ];
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

  // Custom Markdown Parser
  const parseMarkdown = (text: string) => {
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // **bold**
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // *italic*
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // `code`
    html = html.replace(
      /`(.*?)`/g,
      '<code class="bg-zinc-950 px-1 py-0.5 rounded font-mono text-[11px] text-emerald-300 border border-zinc-800">$1</code>'
    );
    // Links: [text](url)
    html = html.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" class="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Mentions highlighting: @DisplayName
    members.forEach((m) => {
      const mentionText = `@${m.displayName}`;
      if (html.includes(mentionText)) {
        html = html.replaceAll(
          mentionText,
          `<span class="bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 rounded px-1.5 py-0.5 font-bold tracking-wide scale-90 inline-block">@${m.displayName}</span>`
        );
      }
    });

    return html;
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

  const contexts = getContextDetails();

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
          {activeEvent?.environment && (
            <div>
              <div className="text-zinc-500 font-medium mb-0.5">Environment</div>
              <div className="inline-block px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 font-mono text-[10px] font-semibold border border-zinc-850">
                {activeEvent.environment.name}
              </div>
            </div>
          )}
          {activeEvent?.release && (
            <div>
              <div className="text-zinc-500 font-medium mb-0.5">Release</div>
              <div className="inline-block px-1.5 py-0.5 rounded bg-zinc-950 text-emerald-400 font-mono text-[10px] font-semibold border border-zinc-850">
                {activeEvent.release.version}
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
              {/* Event occurrence navigation */}
              {events.length > 1 && (
                <div className="bg-zinc-950/45 border border-zinc-850 rounded-xl p-3.5 flex items-center justify-between text-xs">
                  <div className="text-zinc-400 font-medium">
                    Event occurrence{" "}
                    <span className="font-mono font-bold text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                      {activeEventIndex + 1}
                    </span>{" "}
                    of{" "}
                    <span className="font-mono font-bold text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                      {events.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveEventIndex((prev) => Math.max(0, prev - 1));
                        setExpandedFrameIndex(null);
                      }}
                      disabled={activeEventIndex === 0}
                      className="px-2.5 py-1 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 hover:text-white font-semibold rounded cursor-pointer transition-colors"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => {
                        setActiveEventIndex((prev) => Math.min(events.length - 1, prev + 1));
                        setExpandedFrameIndex(null);
                      }}
                      disabled={activeEventIndex === events.length - 1}
                      className="px-2.5 py-1 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 hover:text-white font-semibold rounded cursor-pointer transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Stack Trace Box */}
              <div className="border border-zinc-800 bg-zinc-900/35 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-500" /> Stack Trace
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowRawStackTrace(!showRawStackTrace)}
                      className="text-[10px] px-2 py-1 rounded border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white transition-colors"
                    >
                      {showRawStackTrace ? "Prettier Stack" : "Raw Text"}
                    </button>

                    {!showRawStackTrace && (
                      <button
                        onClick={() => setCollapseLibraryFrames(!collapseLibraryFrames)}
                        className="text-[10px] px-2 py-1 rounded border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white transition-colors"
                      >
                        {collapseLibraryFrames ? "Show Lib Frames" : "Hide Lib Frames"}
                      </button>
                    )}

                    <button
                      onClick={handleCopyStackTrace}
                      className="text-[10px] px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 hover:text-white font-bold flex items-center gap-1 transition-all"
                      title="Copy Stack Trace"
                    >
                      {copiedStack ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedStack ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {!activeEvent ||
                (!activeEvent.rawStackTrace && activeEvent.normalizedFrames.length === 0) ? (
                  <div className="p-8 text-center text-zinc-500 text-xs italic">
                    No stack trace frames captured for this event.
                  </div>
                ) : showRawStackTrace ? (
                  <pre className="p-4 rounded-lg bg-zinc-950 border border-zinc-850 font-mono text-[11px] text-zinc-400 overflow-x-auto max-h-96 leading-relaxed select-all">
                    {activeEvent.rawStackTrace || "No raw stack trace text details."}
                  </pre>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      // Process frames and render
                      const items: React.ReactNode[] = [];
                      const frames = activeEvent.normalizedFrames;
                      let index = 0;

                      while (index < frames.length) {
                        const frame = frames[index];
                        const isApp = isFrameInApp(frame.fileName || "");

                        if (collapseLibraryFrames && !isApp) {
                          // Find consecutive non-app frames
                          let count = 0;
                          const startIdx = index;
                          while (
                            index < frames.length &&
                            !isFrameInApp(frames[index].fileName || "")
                          ) {
                            count++;
                            index++;
                          }

                          items.push(
                            <div
                              key={`collapse-${startIdx}`}
                              className="text-[11px] font-semibold font-mono p-2.5 rounded-lg border border-zinc-850/50 bg-zinc-950/20 text-zinc-500 text-center flex items-center justify-between px-4 select-none hover:bg-zinc-950/40 cursor-pointer"
                              onClick={() => setCollapseLibraryFrames(false)}
                            >
                              <span>Collapsed {count} library frames</span>
                              <span className="text-[9px] text-zinc-600 underline">Expand All</span>
                            </div>
                          );
                        } else {
                          const currentIdx = index;
                          const isExpanded = expandedFrameIndex === currentIdx;
                          items.push(
                            <div
                              key={`frame-${currentIdx}`}
                              className={`flex flex-col rounded-lg border text-xs font-mono transition-all overflow-hidden ${
                                isApp
                                  ? "bg-zinc-950 border-zinc-800/80 hover:bg-zinc-950/80"
                                  : "bg-zinc-900/10 border-zinc-900/40 text-zinc-500 hover:bg-zinc-900/20"
                              }`}
                            >
                              <div
                                onClick={() =>
                                  isApp && setExpandedFrameIndex(isExpanded ? null : currentIdx)
                                }
                                className={`flex items-start justify-between gap-4 p-3 ${isApp ? "cursor-pointer" : ""}`}
                              >
                                <div className="flex flex-col gap-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-bold ${isApp ? "text-emerald-400" : "text-zinc-400"}`}
                                    >
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

                              {/* Source Code Mock Preview context */}
                              {isApp && isExpanded && frame.lineNumber && (
                                <div className="border-t border-zinc-900 bg-zinc-950/90 p-4">
                                  <div className="text-[10px] text-zinc-500 mb-2 flex items-center gap-1 uppercase tracking-wider font-bold">
                                    <CornerDownRight className="h-3 w-3 text-emerald-500" /> Source
                                    Code Context Preview
                                  </div>
                                  <div className="space-y-1 font-mono text-[11px] leading-relaxed">
                                    {getMockSourceCode(
                                      frame.functionName || "",
                                      frame.lineNumber,
                                      frame.fileName || ""
                                    ).map((cLine, cIdx) => (
                                      <div
                                        key={cIdx}
                                        className={`flex gap-3 px-2 py-0.5 rounded ${
                                          cLine.isError
                                            ? "bg-rose-500/10 text-rose-300 border-l-2 border-rose-500"
                                            : "text-zinc-400"
                                        }`}
                                      >
                                        <span className="text-zinc-600 text-right w-8 select-none">
                                          {cLine.line}
                                        </span>
                                        <span className="whitespace-pre truncate">
                                          {cLine.code}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                          index++;
                        }
                      }
                      return items;
                    })()}
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
                {events.map((evt, idx) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      setActiveEventIndex(idx);
                      setActiveTab("overview");
                    }}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs cursor-pointer hover:bg-zinc-950/30 transition-colors ${
                      idx === activeEventIndex
                        ? "bg-emerald-500/5 border-l-2 border-emerald-500"
                        : ""
                    }`}
                  >
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
                Occurrence Tags ({activeEventIndex + 1} of {events.length})
              </h3>
              {!activeEvent || !activeEvent.tags || Object.keys(activeEvent.tags).length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs italic">
                  No tags associated with this event occurrence.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(activeEvent.tags).map(([key, value]) => (
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
                {activeEvent && activeEvent.userExternalId ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900">
                      <span className="block text-zinc-500 font-bold text-[10px] uppercase mb-1">
                        User External ID
                      </span>
                      <span className="text-zinc-200">{activeEvent.userExternalId}</span>
                    </div>
                    {activeEvent.userContext &&
                      Object.entries(activeEvent.userContext).map(([key, val]) => (
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
                    No user context was provided with this event occurrence.
                  </div>
                )}
              </div>

              {/* Parsed Device & Request Context Grid */}
              {contexts && (
                <div className="border border-zinc-800 bg-zinc-900/35 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white border-b border-zinc-850 pb-2 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-emerald-500" /> Device & Request Context
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs font-mono">
                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900/70">
                      <span className="block text-zinc-500 font-bold text-[9px] uppercase mb-1">
                        OS
                      </span>
                      <span className="text-zinc-200 font-semibold">{contexts.os}</span>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900/70">
                      <span className="block text-zinc-500 font-bold text-[9px] uppercase mb-1">
                        Browser
                      </span>
                      <span className="text-zinc-200 font-semibold">{contexts.browser}</span>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900/70">
                      <span className="block text-zinc-500 font-bold text-[9px] uppercase mb-1">
                        SDK Version
                      </span>
                      <span className="text-zinc-200 font-semibold">{contexts.sdkVersion}</span>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900/70">
                      <span className="block text-zinc-500 font-bold text-[9px] uppercase mb-1">
                        IP Address
                      </span>
                      <span className="text-zinc-200 font-semibold">{contexts.ipAddress}</span>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900/70">
                      <span className="block text-zinc-500 font-bold text-[9px] uppercase mb-1">
                        Method
                      </span>
                      <span className="text-emerald-400 font-bold">{contexts.method}</span>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900/70">
                      <span className="block text-zinc-500 font-bold text-[9px] uppercase mb-1">
                        Release
                      </span>
                      <span className="text-zinc-200 font-semibold truncate block">
                        {contexts.release}
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900/70 sm:col-span-2 md:col-span-3">
                      <span className="block text-zinc-500 font-bold text-[9px] uppercase mb-1">
                        Request URL
                      </span>
                      <span className="text-emerald-400 font-semibold break-all">
                        {contexts.url}
                      </span>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900/70 sm:col-span-2 md:col-span-3">
                      <span className="block text-zinc-500 font-bold text-[9px] uppercase mb-1">
                        User Agent
                      </span>
                      <span className="text-zinc-400 font-semibold break-all text-[11px] leading-relaxed">
                        {contexts.userAgent}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Payload JSON */}
              <div className="border border-zinc-800 bg-zinc-900/35 rounded-xl p-5 space-y-4">
                <button
                  onClick={() => setRawJsonExpanded(!rawJsonExpanded)}
                  className="w-full flex items-center justify-between text-sm font-bold text-white border-b border-zinc-850 pb-2 cursor-pointer focus:outline-none"
                >
                  <span className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-emerald-500" /> Raw JSON Payload
                  </span>
                  {rawJsonExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {rawJsonExpanded && activeEvent && (
                  <div className="relative group">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          JSON.stringify(activeEvent.rawPayload, null, 2)
                        );
                        alert("JSON Payload copied!");
                      }}
                      className="absolute right-3 top-3 px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-300 rounded border border-zinc-800 font-bold transition-all opacity-0 group-hover:opacity-100"
                    >
                      Copy JSON
                    </button>
                    <pre className="p-4 rounded-lg bg-zinc-950 border border-zinc-850 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-96 leading-relaxed select-all">
                      {JSON.stringify(activeEvent.rawPayload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Assistant, Triage Actions, Comments, Activity */}
        <div className="lg:col-span-1 space-y-6">
          {/* AI Assistant Panel */}
          <div className="border border-zinc-850 bg-zinc-900/35 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-zinc-850 pb-2 flex items-center gap-2">
              <span className="text-purple-400">✦</span> AI Assistant
            </h3>
            <AiPanel issueId={issueId} />
          </div>
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
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-center text-zinc-600 text-xs italic py-4">
                  No comments yet. Start the conversation!
                </div>
              ) : (
                comments.map((comment) => {
                  const isEditing = editingCommentId === comment.id;
                  const isAuthor = comment.authorUserId === currentUser.id;

                  return (
                    <div
                      key={comment.id}
                      className="space-y-1 text-xs border-b border-zinc-850/40 pb-2.5 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-300">
                            {comment.author.displayName}
                          </span>
                          {comment.author.id === currentUser.id && (
                            <span className="bg-zinc-800 text-zinc-400 px-1 rounded text-[8px] uppercase font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{getRelativeTime(comment.createdAt)}</span>
                          {!isEditing && isAuthor && (
                            <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentBody(comment.body);
                                }}
                                className="text-zinc-400 hover:text-emerald-400 p-0.5 transition-colors"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleCommentDelete(comment.id)}
                                className="text-zinc-400 hover:text-rose-400 p-0.5 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2 mt-1">
                          <textarea
                            value={editingCommentBody}
                            onChange={(e) => setEditingCommentBody(e.target.value)}
                            rows={2}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none font-mono"
                          />
                          <div className="flex items-center justify-end gap-2 text-[10px]">
                            <button
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingCommentBody("");
                              }}
                              className="px-2 py-1 text-zinc-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleCommentEdit(comment.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-lg text-zinc-300 leading-normal break-words markdown-content"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(comment.body) }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Post Comment Form */}
            <form onSubmit={handleCommentSubmit} className="space-y-2 relative">
              <div className="relative">
                <textarea
                  placeholder="Add a comment... (Supports **bold**, *italic*, `code`, @DisplayName)"
                  value={newCommentBody}
                  onChange={(e) => {
                    setNewCommentBody(e.target.value);
                    // Open mention dropdown when typing @
                    if (e.target.value.endsWith("@")) {
                      setShowMentionDropdown(true);
                    } else if (!e.target.value.includes("@") || e.target.value.endsWith(" ")) {
                      setShowMentionDropdown(false);
                    }
                  }}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
                />

                {/* Mention Helper Dropdown */}
                {showMentionDropdown && (
                  <div className="absolute bottom-full left-0 mb-2 w-full max-h-32 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 text-xs py-1">
                    <div className="px-2.5 py-1 text-[9px] font-bold text-zinc-500 uppercase border-b border-zinc-900 tracking-wider">
                      Mention Organization Member
                    </div>
                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setNewCommentBody((prev) => prev + m.displayName + " ");
                          setShowMentionDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
                      >
                        {m.displayName} ({m.email})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowMentionDropdown(!showMentionDropdown)}
                  className="px-2 py-1 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded border border-zinc-800 font-bold transition-all flex items-center gap-1"
                >
                  <span>@</span> Mention
                </button>

                <button
                  type="submit"
                  disabled={!newCommentBody.trim() || isSubmittingComment}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs py-1.5 px-4 rounded-lg cursor-pointer transition-colors"
                >
                  {isSubmittingComment ? "Posting..." : "Post Comment"}
                </button>
              </div>
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
                      {act.type === "COMMENT_EDITED" && "edited a comment"}
                      {act.type === "COMMENT_DELETED" && "deleted a comment"}
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
