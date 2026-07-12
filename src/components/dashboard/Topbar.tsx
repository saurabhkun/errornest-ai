"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Search, ChevronDown, LogOut, User, Folder } from "lucide-react";

interface Project {
  id: string;
  name: string;
  slug: string;
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

export function Topbar({ org, projects, user }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Determine currently selected project from URL path (e.g. /app/[orgSlug]/projects/[projectSlug])
  let activeProject: Project | undefined;
  if (pathname) {
    const parts = pathname.split("/");
    const projectIndex = parts.indexOf("projects") + 1;
    if (projectIndex > 0 && projectIndex < parts.length) {
      const slug = parts[projectIndex];
      // Skip the word "sdk-setup" if present
      if (slug !== "sdk-setup" && slug !== "create") {
        activeProject = projects.find((p) => p.slug === slug || p.id === slug);
      }
    }
  }

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
        {/* Alerts Bell */}
        <button
          className="relative p-2 text-zinc-400 hover:text-zinc-200 rounded-lg border border-transparent hover:border-zinc-800 hover:bg-zinc-900 cursor-pointer"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500" />
        </button>

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
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 cursor-not-allowed select-none">
                    <User className="h-4 w-4" />
                    <span>My Profile</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 cursor-not-allowed select-none border-b border-zinc-800">
                    <span>Settings</span>
                  </div>
                </div>

                <div className="py-1">
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 cursor-not-allowed select-none">
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
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
