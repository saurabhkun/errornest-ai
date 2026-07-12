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
      disabled: true,
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
      disabled: true,
    },
    {
      name: "Team",
      href: `/app/${org.slug}/settings/team`,
      icon: Users2,
      disabled: true,
    },
    {
      name: "Settings",
      href: `/app/${org.slug}/settings/audit`,
      icon: Settings2,
      disabled: true,
    },
  ];

  return (
    <aside
      className={`relative h-full border-r border-zinc-800 bg-zinc-950 flex flex-col transition-all duration-200 ease-in-out ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header / Brand */}
      <div className="h-16 flex items-center px-4 border-b border-zinc-800 gap-3 overflow-hidden select-none">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shrink-0">
          EN
        </div>
        {!isCollapsed && (
          <span className="font-semibold text-lg tracking-tight text-white">ErrorNest</span>
        )}
      </div>

      {/* Organization Info Switcher */}
      <div className="p-3 border-b border-zinc-800 overflow-hidden">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
          <div className="h-6 w-6 rounded bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300 shrink-0 uppercase">
            {org.name.slice(0, 2)}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-200 truncate leading-none mb-1">
                {org.name}
              </span>
              <span className="text-[10px] text-zinc-500 truncate leading-none">
                Free Workspace
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname ? pathname.startsWith(item.href) : false;

          if (item.disabled) {
            return (
              <div
                key={item.name}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 cursor-not-allowed select-none ${
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group relative ${
                isActive
                  ? "bg-zinc-800 text-emerald-400"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Area */}
      <div className="p-4 border-t border-zinc-800 overflow-hidden">
        <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          {!isCollapsed && (
            <span className="text-xs font-medium text-zinc-500">M2 Sandbox Ready</span>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute bottom-16 -right-3 h-6 w-6 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 cursor-pointer shadow-md shrink-0 z-10"
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
