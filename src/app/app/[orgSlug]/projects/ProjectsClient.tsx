"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Terminal, Key, ShieldAlert, FolderGit2, X, Code } from "lucide-react";

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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Create and manage integration scopes to isolate error events.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Create Project</span>
        </button>
      </div>

      {/* Projects List Grid */}
      {projects.length === 0 ? (
        <div className="border border-zinc-800 bg-zinc-900/50 rounded-xl p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto mt-6">
          <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4 border border-zinc-700">
            <FolderGit2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-white">No projects found</h2>
          <p className="text-sm text-zinc-400 mt-2 max-w-sm">
            To start collecting runtime errors, create your first project and link it with our
            client SDK.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 rounded-xl p-6 transition-all relative group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 uppercase select-none tracking-wide">
                    {project.platform}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    ID: {project.id.slice(0, 8)}...
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors leading-tight mb-2 truncate">
                  {project.name}
                </h3>
                <p className="text-xs text-zinc-500 mb-6">
                  Created on {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800/80">
                <Link
                  href={`/app/${org.slug}/projects/${project.slug}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>API Keys</span>
                </Link>
                <Link
                  href={`/app/${org.slug}/projects/${project.slug}/sdk-setup`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
                >
                  <Code className="h-3.5 w-3.5" />
                  <span>SDK Guide</span>
                </Link>
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
