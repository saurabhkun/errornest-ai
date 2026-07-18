"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderGit2,
  LayoutDashboard,
  AlertOctagon,
  Layers,
  Users2,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  org: {
    id: string;
    name: string;
    slug: string;
  };
}

export function Sidebar({ org }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    {
      name: "Dashboard",
      href: `/app/${org.slug}/dashboard`,
      icon: LayoutDashboard,
      disabled: false,
    },
    {
      name: "Projects",
      href: `/app/${org.slug}/projects`,
      icon: FolderGit2,
      disabled: false,
    },
    {
      name: "Issues",
      href: `/app/${org.slug}/issues`,
      icon: AlertOctagon,
      disabled: true,
    },
    {
      name: "Releases",
      href: `/app/${org.slug}/releases`,
      icon: Layers,
      disabled: false,
    },
    {
      name: "Team",
      href: `/app/${org.slug}/settings/team`,
      icon: Users2,
      disabled: false,
    },
    {
      name: "Settings",
      href: `/app/${org.slug}/settings/audit`,
      icon: Settings2,
      disabled: false,
    },
  ];

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-border bg-surface-sidebar transition-all duration-200 ease-out ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header / Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4 overflow-hidden select-none">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
          EN
        </div>
        {!isCollapsed && (
          <span className="text-lg font-semibold tracking-tight text-foreground">ErrorNest</span>
        )}
      </div>

      {/* Organization Info Switcher */}
      <div className="overflow-hidden border-b border-border p-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated px-2 py-1.5 shrink-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-surface-hover text-xs font-medium uppercase text-muted-foreground">
            {org.name.slice(0, 2)}
          </div>
          {!isCollapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="mb-1 truncate text-xs font-semibold leading-none text-foreground">
                {org.name}
              </span>
              <span className="truncate text-[10px] leading-none text-muted-foreground">
                Free Workspace
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname ? pathname.startsWith(item.href) : false;

          if (item.disabled) {
            return (
              <div
                key={item.name}
                className={`flex cursor-not-allowed select-none items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground ${
                  isCollapsed ? "justify-center" : ""
                }`}
                title={`${item.name} (Coming in a future milestone)`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                isActive
                  ? "bg-surface-active text-primary"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Area */}
      <div className="overflow-hidden border-t border-border p-4">
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          {!isCollapsed && <span className="text-xs font-medium text-muted-foreground">v1.0.0</span>}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute bottom-16 -right-3 z-10 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-raised text-muted-foreground shadow-sm hover:border-border/80 hover:bg-surface-hover hover:text-foreground"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </aside>
  );
}
