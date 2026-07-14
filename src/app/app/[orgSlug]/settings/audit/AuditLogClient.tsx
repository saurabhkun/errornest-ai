"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, Info } from "lucide-react";

interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorNameSnapshot: string;
  actorEmailSnapshot: string;
  actionType: string;
  targetType: string;
  targetId: string;
  beforeState: unknown;
  afterState: unknown;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: string;
}

interface AuditLogClientProps {
  orgId: string;
}

export function AuditLogClient({ orgId }: AuditLogClientProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");

  // Selected log for diff viewer modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "15",
      });

      if (actionFilter) params.append("actionType", actionFilter);
      if (targetFilter) params.append("targetType", targetFilter);

      const response = await fetch(`/api/v1/organizations/${orgId}/audit-log?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to load audit logs");
      }

      setLogs(result.data);
      setTotalPages(result.meta.totalPages);
      setTotalCount(result.meta.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, targetFilter, orgId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setPage((p) => Math.min(totalPages, p + 1));

  // Reset page when filters change
  const handleActionFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionFilter(e.target.value);
    setPage(1);
  };

  const handleTargetFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetFilter(e.target.value);
    setPage(1);
  };

  // Helper to format action tags beautifully
  const formatActionTag = (action: string) => {
    if (action.endsWith("_CREATE")) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/80 border border-emerald-900/50 text-emerald-400">CREATE</span>;
    }
    if (action.endsWith("_UPDATE")) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-950/80 border border-blue-900/50 text-blue-400">UPDATE</span>;
    }
    if (action.endsWith("_DELETE")) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950/80 border border-rose-900/50 text-rose-400">DELETE</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">{action}</span>;
  };

  const renderJsonDiff = (before: unknown, after: unknown) => {
    const beforeObj = before && typeof before === "object" ? (before as Record<string, unknown>) : null;
    const afterObj = after && typeof after === "object" ? (after as Record<string, unknown>) : null;
    const beforeStr = beforeObj && Object.keys(beforeObj).length > 0 ? JSON.stringify(beforeObj, null, 2) : null;
    const afterStr = afterObj && Object.keys(afterObj).length > 0 ? JSON.stringify(afterObj, null, 2) : null;

    if (!beforeStr && !afterStr) {
      return <div className="text-zinc-500 text-sm italic">No state changes recorded.</div>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs overflow-x-auto">
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Before State</div>
          <pre className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-lg overflow-x-auto text-rose-300 max-h-72 overflow-y-auto">
            {beforeStr || "null (Initial)"}
          </pre>
        </div>
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">After State</div>
          <pre className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-lg overflow-x-auto text-emerald-300 max-h-72 overflow-y-auto">
            {afterStr || "null (Deleted)"}
          </pre>
        </div>
      </div>
    );
  };

  // Standard Action & Target types
  const actionTypes = [
    "ORGANIZATION_UPDATE",
    "ORGANIZATION_DELETE",
    "PROJECT_CREATE",
    "PROJECT_UPDATE",
    "PROJECT_DELETE",
    "API_KEY_CREATE",
    "API_KEY_REVOKE",
    "API_KEY_ROTATE",
    "ALERT_RULE_CREATE",
    "ALERT_RULE_UPDATE",
    "ALERT_RULE_DELETE",
    "ISSUE_STATUS_UPDATE",
    "ISSUE_ASSIGN",
    "ISSUE_BULK_STATUS_UPDATE",
    "ISSUE_BULK_DELETE",
  ];

  const targetTypes = ["Organization", "Project", "ApiKey", "AlertRule", "Issue", "Comment"];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white">Security Audit Log</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Historical log of all administrative actions and security mutations in this organization.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-zinc-950/40 p-4 border border-zinc-800/60 rounded-xl">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Action Type</label>
          <select
            value={actionFilter}
            onChange={handleActionFilterChange}
            className="bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/80"
          >
            <option value="">All Actions</option>
            {actionTypes.map((act) => (
              <option key={act} value={act}>
                {act.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Resource Type</label>
          <select
            value={targetFilter}
            onChange={handleTargetFilterChange}
            className="bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/80"
          >
            <option value="">All Resources</option>
            {targetTypes.map((targ) => (
              <option key={targ} value={targ}>
                {targ}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchLogs}
          className="ml-auto p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg transition-all"
          title="Refresh logs"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-emerald-500" : ""}`} />
        </button>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20 text-zinc-500 text-sm gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
          Loading audit trail...
        </div>
      ) : error ? (
        <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-400 text-sm">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-zinc-400 font-bold text-xs uppercase tracking-wider select-none">
                    <th className="p-4">Time</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Target Resource</th>
                    <th className="p-4">IP / Req ID</th>
                    <th className="p-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/50 text-zinc-300 text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-900/20 transition-all">
                      <td className="p-4 whitespace-nowrap text-zinc-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-zinc-200">{log.actorNameSnapshot}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{log.actorEmailSnapshot}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          {formatActionTag(log.actionType)}
                          <span className="text-[10px] text-zinc-500 font-semibold">{log.actionType.replace(/_/g, " ")}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-zinc-200">{log.targetType}</div>
                        <div className="text-[10px] text-zinc-500 font-mono select-all truncate max-w-[140px]">{log.targetId}</div>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-zinc-500 space-y-0.5">
                        <div>IP: {log.ipAddress || "System"}</div>
                        <div>RID: {log.requestId ? log.requestId.slice(0, 8) + "..." : "N/A"}</div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white rounded transition-all font-medium"
                        >
                          View State
                        </button>
                      </td>
                    </tr>
                  ))}

                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-zinc-500 text-sm">
                        No audit logs match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-500 select-none">
                Showing {logs.length} of {totalCount} logs (Page {page} of {totalPages})
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-zinc-200 transition-all"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={page === totalPages}
                  className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-zinc-200 transition-all"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Diff Viewer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Info className="text-emerald-500 h-5 w-5" />
                  Audit Log Details
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  ID: {selectedLog.id} • {new Date(selectedLog.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-zinc-200 text-sm font-semibold p-1 hover:bg-zinc-900 rounded"
              >
                Close
              </button>
            </div>

            {/* Info Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-900/40 p-4 border border-zinc-850 rounded-xl text-xs">
              <div>
                <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Actor</span>
                <span className="text-zinc-200 font-semibold">{selectedLog.actorNameSnapshot}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Action Type</span>
                <span className="text-zinc-200 font-mono font-semibold">{selectedLog.actionType}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">Resource</span>
                <span className="text-zinc-200 font-semibold">{selectedLog.targetType}</span>
              </div>
              <div>
                <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[10px]">IP / Request ID</span>
                <span className="text-zinc-200 font-mono">{selectedLog.ipAddress || "System"}</span>
              </div>
            </div>

            {/* Render Diffs */}
            <div className="space-y-2">
              <span className="text-zinc-400 font-bold text-xs uppercase tracking-wider block">State Differences</span>
              {renderJsonDiff(selectedLog.beforeState, selectedLog.afterState)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
