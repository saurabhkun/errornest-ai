"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Sliders,
  Folder,
  Check,
  Eye,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  targetUrl: string;
  readAt: string | null;
  createdAt: string;
}

interface TopbarProps {
  org: {
    id: string;
    name: string;
    slug: string;
  };
  projects: Project[];
  user: {
    displayName: string;
    email: string;
    avatarUrl: string | null;
  };
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Topbar({ org, projects, user }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Notification States
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "unread">("unread");

  // Determine currently selected project from URL path
  let activeProject: Project | undefined;
  if (pathname) {
    const parts = pathname.split("/");
    const projectIndex = parts.indexOf("projects") + 1;
    if (projectIndex > 0 && projectIndex < parts.length) {
      const slug = parts[projectIndex];
      if (slug !== "sdk-setup" && slug !== "create") {
        activeProject = projects.find((p) => p.slug === slug || p.id === slug);
      }
    }
  }

  // Fetch count of unreads for the badge
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications?status=unread&limit=1");
      if (res.ok) {
        const body = await res.json();
        setUnreadCount(body.meta.totalCount);
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, []);

  // Fetch list of notifications
  const fetchNotificationsList = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      const currentOffset = reset ? 0 : offset;
      try {
        const res = await fetch(
          `/api/v1/notifications?status=${statusFilter}&limit=10&offset=${currentOffset}`
        );
        if (res.ok) {
          const body = await res.json();
          if (reset) {
            setNotifications(body.data);
          } else {
            setNotifications((prev) => [...prev, ...body.data]);
          }
          setHasMore(body.meta.hasMore);
          setOffset(currentOffset + body.data.length);
          if (statusFilter === "unread") {
            setUnreadCount(body.meta.totalCount);
          }
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [offset, statusFilter]
  );

  // Handle load more
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchNotificationsList(false);
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (notifId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch(`/api/v1/notifications/${notifId}/read`, { method: "POST" });
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);

    try {
      await fetch("/api/v1/notifications/read-all", { method: "POST" });
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  // Handle notification click to navigate
  const handleNotificationClick = async (notif: Notification) => {
    setIsNotificationsOpen(false);
    if (!notif.readAt) {
      await handleMarkAsRead(notif.id);
    }
    router.push(notif.targetUrl);
  };

  // Initial and poll unread count
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      fetchUnreadCount();
    }, 0);
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      clearTimeout(delayTimer);
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  // Re-fetch list when filter or dropdown state changes
  useEffect(() => {
    if (isNotificationsOpen) {
      const delayTimer = setTimeout(() => {
        fetchNotificationsList(true);
      }, 0);
      return () => clearTimeout(delayTimer);
    }
  }, [statusFilter, isNotificationsOpen, fetchNotificationsList]);

  return (
    <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface-sidebar px-6">
      {/* Left: Project Switcher */}
      <div className="relative">
        <button
          onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
          className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-surface-hover"
        >
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span>{activeProject ? activeProject.name : "Select Project..."}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {isProjectDropdownOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsProjectDropdownOpen(false)} />
            <div className="absolute left-0 z-40 mt-2 w-56 rounded-xl border border-border bg-surface-panel py-1 shadow-panel">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Switch Project
              </div>
              <div className="max-h-60 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setIsProjectDropdownOpen(false);
                      router.push(`/app/${org.slug}/projects/${p.slug}`);
                    }}
                    className={`flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm hover:bg-surface-hover ${
                      activeProject?.id === p.id ? "font-medium text-primary" : "text-foreground"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="mt-1 border-t border-border pt-1">
                <Link
                  href={`/app/${org.slug}/projects`}
                  onClick={() => setIsProjectDropdownOpen(false)}
                  className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                >
                  View All Projects
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Middle: Search Box */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div className="w-full relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects or issues (Cmd + K)..."
            className="w-full rounded-xl border border-border bg-surface-input py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground focus:border-primary/70 focus:outline-none"
            disabled
          />
          <kbd className="pointer-events-none absolute right-3 top-2.5 flex h-5 items-center justify-center rounded border border-border bg-surface-canvas px-1.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Notifications & User */}
      <div className="flex items-center gap-4">
        {/* Alerts Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative cursor-pointer rounded-xl border p-2 transition-colors ${
              isNotificationsOpen
                ? "border-border bg-surface-elevated text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:bg-surface-elevated hover:text-foreground"
            }`}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)} />
              <div className="absolute right-0 z-40 mt-2 flex max-h-[480px] w-80 flex-col rounded-xl border border-border bg-surface-panel py-1 shadow-overlay sm:w-96">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                    >
                      <Check className="h-3 w-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Filter Selector */}
                <div className="flex gap-2 border-b border-border bg-surface-canvas/60 px-2 py-1.5">
                  <button
                    onClick={() => {
                      setStatusFilter("unread");
                      setOffset(0);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      statusFilter === "unread"
                        ? "bg-surface-hover text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Unread Only
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setOffset(0);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      statusFilter === "all"
                        ? "bg-surface-hover text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Notifications
                  </button>
                </div>

                {/* Notification List */}
                <div className="flex-1 divide-y divide-border/60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                        </div>
                      ) : (
                        <p className="text-xs font-medium">No notifications found.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`relative flex cursor-pointer items-start gap-3 p-3.5 transition-colors hover:bg-surface-hover/40 ${
                            !notif.readAt ? "bg-surface-canvas/30" : ""
                          }`}
                        >
                          {/* Unread Indicator dot */}
                          {!notif.readAt && (
                            <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-bold text-foreground">
                                {notif.title}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {timeAgo(notif.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {notif.body}
                            </p>
                          </div>
                          {!notif.readAt && (
                            <button
                              onClick={(e) => handleMarkAsRead(notif.id, e)}
                              className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-primary"
                              title="Mark as read"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {hasMore && (
                        <button
                          onClick={handleLoadMore}
                          disabled={isLoading}
                          className="flex w-full items-center justify-center gap-1.5 border-t border-border/50 py-2.5 text-center text-xs font-semibold text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <span>Load More</span>
                              <ExternalLink className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 cursor-pointer select-none"
            aria-label="User menu"
          >
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border border-zinc-800"
                unoptimized
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-300">
                {user.displayName.slice(0, 1)}
              </div>
            )}
            <span className="hidden sm:inline text-sm font-medium text-zinc-300">
              {user.displayName}
            </span>
          </button>

          {isUserMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsUserMenuOpen(false)} />
              <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-border bg-surface-panel py-1 shadow-overlay">
                <div className="border-b border-border px-3 py-2">
                  <div className="text-sm font-medium text-foreground">{user.displayName}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </div>

                <div className="py-1">
                  <Link
                    href={`/app/${org.slug}/settings/notification-preferences`}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-hover"
                  >
                    <Sliders className="h-4 w-4" />
                    <span>Notification Settings</span>
                  </Link>
                </div>

                <div className="border-t border-border py-1">
                  <div className="flex cursor-not-allowed select-none items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <LogOut className="h-4 w-4" />
                    <span>Log Out (Demo Mode)</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
