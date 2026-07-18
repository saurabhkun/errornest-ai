"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import {
  Plus,
  Terminal,
  Key,
  ShieldAlert,
  FolderGit2,
  X,
  Code,
  Search,
  Sparkles,
  ArrowUpRight,
  LayoutGrid,
  List,
  Clock3,
  TrendingUp,
  Users2,
} from "lucide-react";

interface SerializedProject {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  platform: string;
  status: string;
  createdAt: string;
}

interface ProjectsClientProps {
  org: {
    id: string;
    name: string;
    slug: string;
  };
  initialProjects: SerializedProject[];
}

export function ProjectsClient({ org, initialProjects }: ProjectsClientProps) {
  const [projects, setProjects] = useState<SerializedProject[]>(initialProjects);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("react");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "name">("createdAt");
  const cardsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!cardsRef.current) {
      return;
    }

    gsap.fromTo(
      cardsRef.current.querySelectorAll<HTMLElement>("[data-project-card]"),
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.07, ease: "power3.out" }
    );
  }, [projects, viewMode]);

  const filteredProjects = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const next = projects.filter((project) => {
      if (!normalized) {
        return true;
      }

      return [project.name, project.platform].some((value) =>
        value.toLowerCase().includes(normalized)
      );
    });

    return next.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [projects, searchTerm, sortBy]);

  const platforms = [
    { value: "react", label: "React" },
    { value: "node", label: "Node.js" },
    { value: "python", label: "Python" },
    { value: "go", label: "Go" },
    { value: "nextjs", label: "Next.js" },
    { value: "ruby", label: "Ruby" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/v1/organizations/${org.id}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, platform }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to create project");
      }

      const newProj = body.data;
      setProjects([
        {
          id: newProj.id,
          organizationId: newProj.organizationId,
          name: newProj.name,
          slug: newProj.slug,
          platform: newProj.platform,
          status: newProj.status,
          createdAt: new Date().toISOString(),
        },
        ...projects,
      ]);
      setIsModalOpen(false);
      setName("");
      setPlatform("react");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(13,20,42,0.95),rgba(8,13,26,0.92))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
              <Sparkles className="h-3.5 w-3.5" />
              Project command center
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Projects</h1>
            <p className="mt-2 text-sm text-slate-400">
              Create and manage integration scopes that keep telemetry, releases, and issue triage organized.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(91,140,255,0.25)] transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="text"
              placeholder="Search projects or platform"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-primary/40 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "createdAt" | "name")}
              className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-primary/40 focus:outline-none"
            >
              <option value="createdAt">Newest first</option>
              <option value="name">Name A–Z</option>
            </select>
            <div className="flex rounded-2xl border border-white/10 bg-slate-950/70 p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-xl p-2 ${viewMode === "grid" ? "bg-primary/15 text-white" : "text-slate-400"}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded-xl p-2 ${viewMode === "list" ? "bg-primary/15 text-white" : "text-slate-400"}`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-[30px] border border-white/10 bg-[rgba(8,13,27,0.92)] p-12 text-center shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-slate-300">
            <FolderGit2 className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-white">No projects found</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Start collecting runtime errors by creating your first project and linking it with the client SDK.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        </div>
      ) : (
        <div ref={cardsRef} className={viewMode === "grid" ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              data-project-card
              className={`group relative overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(8,13,27,0.92)] p-6 transition hover:-translate-y-1 hover:border-primary/20 hover:bg-[rgba(11,17,34,0.96)] ${viewMode === "list" ? "flex flex-col gap-4 md:flex-row md:items-center md:justify-between" : "flex flex-col justify-between"}`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-sky-400/70 to-transparent" />
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                    {project.platform}
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    Healthy
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white transition group-hover:text-primary">
                    {project.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Created {new Date(project.createdAt).toLocaleDateString()} • {project.id.slice(0, 8)}...
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    2m ago deploy
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    0.8% error trend
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Users2 className="h-4 w-4 text-primary" />
                  4 team members synced
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-900 bg-gradient-to-br from-primary/80 to-sky-400/70 text-[11px] font-semibold text-white"
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 text-xs text-slate-500">Premium onboarding ready</div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link
                    href={`/app/${org.slug}/projects/${project.slug}`}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/15"
                  >
                    <Key className="h-4 w-4" />
                    API Keys
                  </Link>
                  <Link
                    href={`/app/${org.slug}/projects/${project.slug}/sdk-setup`}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-primary/20 hover:text-white"
                  >
                    <Code className="h-4 w-4" />
                    SDK Guide
                  </Link>
                </div>
              </div>
              <div className="absolute right-4 top-4 opacity-0 transition group-hover:opacity-100">
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => {
              if (!isLoading) setIsModalOpen(false);
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-lg font-bold text-white">Create New Project</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 cursor-pointer"
                  disabled={isLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-3 p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-red-200 text-xs leading-normal">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="proj-name" className="text-xs font-semibold text-zinc-300">
                    Project Name
                  </label>
                  <input
                    id="proj-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Web Frontend"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="proj-platform" className="text-xs font-semibold text-zinc-300">
                    Platform
                  </label>
                  <div className="relative">
                    <select
                      id="proj-platform"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-600 appearance-none cursor-pointer"
                      disabled={isLoading}
                    >
                      {platforms.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                      <Terminal className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-300 hover:text-white rounded-lg cursor-pointer transition-colors"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-white rounded-lg cursor-pointer transition-colors flex items-center justify-center"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
