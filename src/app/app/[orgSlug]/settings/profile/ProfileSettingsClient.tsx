"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Monitor, XCircle, ShieldCheck } from "lucide-react";

interface SessionItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

interface ProfileSettingsClientProps {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

export function ProfileSettingsClient({ user }: ProfileSettingsClientProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    setSessionsError(null);
    try {
      const response = await fetch("/api/v1/me/sessions");
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to load active sessions");
      }
      setSessions(result.data);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to load active sessions");
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      const response = await fetch("/api/v1/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to update profile name");
      }

      setUpdateSuccess(true);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to revoke this session? You will be logged out of that device.")) {
      return;
    }

    setRevokingId(sessionId);
    try {
      const response = await fetch(`/api/v1/me/sessions/${sessionId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to revoke session");
      }

      // Filter out revoked session
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  // Helper to parse user agent
  const formatUserAgent = (ua: string | null) => {
    if (!ua) return "Unknown Device/Browser";
    if (ua.includes("Windows")) {
      return `Windows (${ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : "Browser"})`;
    }
    if (ua.includes("Macintosh")) {
      return `macOS (${ua.includes("Safari") && !ua.includes("Chrome") ? "Safari" : "Chrome"})`;
    }
    if (ua.includes("Linux")) {
      return "Linux / Unix Device";
    }
    if (ua.includes("iPhone") || ua.includes("iPad")) {
      return "iOS Mobile Device";
    }
    if (ua.includes("Android")) {
      return "Android Mobile Device";
    }
    return ua.slice(0, 45) + "...";
  };

  return (
    <div className="space-y-10">
      {/* Profile Form */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Profile Details</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Update your public display name and account details.
          </p>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Email Address (Read-only)
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full bg-zinc-950/60 border border-zinc-800/50 rounded-lg px-4 py-2.5 text-zinc-500 font-mono text-sm cursor-not-allowed select-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="display-name" className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isUpdating}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 disabled:opacity-50 transition-all"
            />
          </div>

          {updateError && (
            <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-400 text-sm">
              {updateError}
            </div>
          )}

          {updateSuccess && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-emerald-400 text-sm">
              Profile updated successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={isUpdating || displayName.trim() === user.displayName}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isUpdating && <RefreshCw className="h-4 w-4 animate-spin" />}
            Update Profile
          </button>
        </form>
      </section>

      {/* Active Sessions */}
      <section className="border-t border-zinc-800/80 pt-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Active Login Sessions</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Devices currently logged into your ErrorNest account. You can revoke access for any session at any time.
          </p>
        </div>

        {isLoadingSessions ? (
          <div className="flex items-center gap-2.5 text-zinc-500 text-sm py-4">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
            Loading active sessions...
          </div>
        ) : sessionsError ? (
          <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-400 text-sm">
            {sessionsError}
          </div>
        ) : (
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/40">
            <div className="divide-y divide-zinc-800/60">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 hover:bg-zinc-900/25 transition-all">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 shrink-0">
                      <Monitor className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                        {formatUserAgent(session.userAgent)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 font-mono">
                        <span>{session.ipAddress || "Unknown IP"}</span>
                        <span>•</span>
                        <span>Logged in on {new Date(session.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingId === session.id}
                    className="p-1.5 hover:bg-rose-950/30 hover:border-rose-900/50 border border-transparent rounded-lg text-zinc-500 hover:text-rose-400 transition-all"
                    title="Revoke session"
                  >
                    {revokingId === session.id ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                  </button>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="p-6 text-center text-zinc-500 text-sm flex flex-col items-center gap-2.5">
                  <ShieldCheck className="h-8 w-8 text-zinc-600" />
                  No other active sessions found.
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
