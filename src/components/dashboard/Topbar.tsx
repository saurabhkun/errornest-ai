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
    <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0 z-20">
      {/* Left: Project Switcher */}
      <div className="relative">
        <button
          onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-200 hover:text-white cursor-pointer select-none"
        >
          <Folder className="h-4 w-4 text-zinc-400" />
          <span>{activeProject ? activeProject.name : "Select Project..."}</span>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        </button>

        {isProjectDropdownOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsProjectDropdownOpen(false)} />
            <div className="absolute left-0 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl py-1 z-40">
              <div className="px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
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
                    className={`w-full flex items-center text-left px-3 py-2 text-sm hover:bg-zinc-800 cursor-pointer ${
                      activeProject?.id === p.id ? "text-emerald-400 font-medium" : "text-zinc-300"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="border-t border-zinc-800 mt-1 pt-1">
                <Link
                  href={`/app/${org.slug}/projects`}
                  onClick={() => setIsProjectDropdownOpen(false)}
                  className="flex items-center px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
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
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search projects or issues (Cmd + K)..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            disabled
          />
          <kbd className="absolute right-3 top-2.5 h-5 px-1.5 rounded border border-zinc-800 bg-zinc-950 text-[10px] text-zinc-500 font-mono flex items-center justify-center pointer-events-none">
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
            className={`relative p-2 rounded-lg border transition-colors cursor-pointer ${
              isNotificationsOpen
                ? "border-zinc-700 bg-zinc-900 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-800 hover:bg-zinc-900"
            }`}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl py-1 z-40 flex flex-col max-h-[480px] animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header */}
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900 text-[10px] font-semibold text-emerald-400">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="h-3 w-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Filter Selector */}
                <div className="px-2 py-1.5 bg-zinc-950/40 border-b border-zinc-800 flex gap-2">
                  <button
                    onClick={() => {
                      setStatusFilter("unread");
                      setOffset(0);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      statusFilter === "unread"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-450 hover:text-zinc-200"
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
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-450 hover:text-zinc-200"
                    }`}
                  >
                    All Notifications
                  </button>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
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
                          className={`p-3.5 hover:bg-zinc-800/40 cursor-pointer transition-colors relative flex items-start gap-3 ${
                            !notif.readAt ? "bg-zinc-950/30" : ""
                          }`}
                        >
                          {/* Unread Indicator dot */}
                          {!notif.readAt && (
                            <span className="absolute top-4 left-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-zinc-200 truncate">
                                {notif.title}
                              </span>
                              <span className="text-[10px] text-zinc-550 shrink-0">
                                {timeAgo(notif.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                              {notif.body}
                            </p>
                          </div>
                          {!notif.readAt && (
                            <button
                              onClick={(e) => handleMarkAsRead(notif.id, e)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 shrink-0 transition-colors"
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
                          className="w-full py-2.5 text-center text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-t border-zinc-800/50 flex items-center justify-center gap-1.5"
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
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl py-1 z-40">
                <div className="px-3 py-2 border-b border-zinc-800">
                  <div className="text-sm font-medium text-zinc-200">{user.displayName}</div>
                  <div className="text-xs text-zinc-500 truncate">{user.email}</div>
                </div>

                <div className="py-1">
                  <Link
                    href={`/app/${org.slug}/settings/notification-preferences`}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    <Sliders className="h-4 w-4" />
                    <span>Notification Settings</span>
                  </Link>
                </div>

                <div className="py-1 border-t border-zinc-800">
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-650 cursor-not-allowed select-none">
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
