"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import {
  AlertOctagon,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  Layers,
  LayoutDashboard,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";

interface SidebarProps {
  org: {
    id: string;
    name: string;
    slug: string;
  };
  user?: {
    displayName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export function Sidebar({ org, user }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const asideRef = useRef<HTMLElement | null>(null);

  const navSections = useMemo(
    () => [
      {
        title: "Workspace",
        items: [
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
            name: "Releases",
            href: `/app/${org.slug}/releases`,
            icon: Layers,
            disabled: false,
          },
        ],
      },
      {
        title: "Operations",
        items: [
          {
            name: "Issues",
            href: `/app/${org.slug}/issues`,
            icon: AlertOctagon,
            disabled: true,
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
        ],
      },
    ],
    [org.slug]
  );

  useEffect(() => {
    if (!asideRef.current) {
      return;
    }

    const items = asideRef.current.querySelectorAll<HTMLElement>("[data-nav-item]");
    gsap.fromTo(
      asideRef.current,
      { x: -24, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.65, ease: "power3.out" }
    );
    gsap.fromTo(
      items,
      { x: -10, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, stagger: 0.06, delay: 0.08, ease: "power3.out" }
    );
  }, []);

  return (
    <aside
      ref={asideRef}
      className={`relative flex h-full flex-col border-r border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(91,140,255,0.2),_transparent_34%),linear-gradient(135deg,_rgba(6,12,24,0.98),_rgba(9,16,30,0.95))] backdrop-blur-xl transition-all duration-300 ease-out ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4 select-none">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-sky-400 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,140,255,0.28)]">
          EN
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">ErrorNest</p>
            <p className="text-[11px] text-slate-400">Operations console</p>
          </div>
        )}
      </div>

      <div className="border-b border-white/10 p-3">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Workspace</p>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              Live
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900/70 text-sm font-semibold uppercase text-slate-200">
              {org.name.slice(0, 2)}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-white">{org.name}</p>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <p className="truncate text-xs text-slate-400">Premium workspace</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!isCollapsed && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                {section.title}
              </p>
            )}

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname ? pathname.startsWith(item.href) : false;

                if (item.disabled) {
                  return (
                    <div
                      key={item.name}
                      data-nav-item
                      className={`flex cursor-not-allowed select-none items-center gap-3 rounded-2xl px-3 py-2.5 text-slate-500 ${
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
                    data-nav-item
                    className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 ${
                      isActive
                        ? "bg-primary/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "text-slate-400 hover:bg-white/8 hover:text-white"
                    } ${isCollapsed ? "justify-center" : ""}`}
                  >
                    <div
                      className={`absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-sky-300 transition-all ${
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                      }`}
                    />
                    <Icon className="relative z-10 h-4 w-4 shrink-0" />
                    {!isCollapsed && <span className="relative z-10 text-sm font-medium">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/8 p-3" data-nav-item>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Workspace pulse
          </div>
          {!isCollapsed ? (
            <>
              <p className="text-sm font-semibold text-white">High-confidence routing</p>
              <p className="mt-1 text-xs leading-6 text-slate-400">
                Keep releases stable with one refined command center.
              </p>
              <button className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-900">
                <Plus className="h-3.5 w-3.5" />
                New insight
              </button>
            </>
          ) : (
            <div className="flex justify-center">
              <BriefcaseBusiness className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur ${isCollapsed ? "justify-center" : ""}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-sky-400/80 text-sm font-semibold text-white">
            {user?.displayName?.slice(0, 1) || "U"}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.displayName || "Operator"}</p>
              <p className="truncate text-xs text-slate-400">{user?.email || "Workspace owner"}</p>
            </div>
          )}
          {!isCollapsed && <ShieldCheck className="h-4 w-4 text-emerald-400" />}
        </div>
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute bottom-24 -right-3 z-10 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-slate-950/90 text-slate-400 shadow-[0_10px_20px_rgba(0,0,0,0.25)] transition hover:border-primary/40 hover:text-white"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
