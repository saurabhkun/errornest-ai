"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, RefreshCw } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface GeneralSettingsClientProps {
  organization: Organization;
  userRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
}

export function GeneralSettingsClient({ organization, userRole }: GeneralSettingsClientProps) {
  const router = useRouter();
  const [orgName, setOrgName] = useState(organization.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Danger zone state
  const [confirmSlug, setConfirmSlug] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const canManage = userRole === "OWNER" || userRole === "ADMIN";
  const isOwner = userRole === "OWNER";

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      const response = await fetch(`/api/v1/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to update organization name");
      }

      setUpdateSuccess(true);
      router.refresh();
      // Wait a short time then redirect if slug changed
      if (result.data.slug !== organization.slug) {
        setTimeout(() => {
          router.push(`/app/${result.data.slug}/settings`);
        }, 1000);
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    if (confirmSlug !== organization.slug) {
      setDeleteError("Confirmation slug does not match");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/v1/organizations/${organization.id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to delete organization");
      }

      router.push("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* General Settings Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Organization Settings</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Update the public name and URL identifier of your organization.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <label
              htmlFor="org-name"
              className="text-xs font-bold text-zinc-400 uppercase tracking-wider"
            >
              Organization Name
            </label>
            <input
              id="org-name"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={!canManage || isUpdating}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 disabled:opacity-50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Organization Slug (URL identifier)
            </label>
            <div className="bg-zinc-950/60 border border-zinc-800/50 rounded-lg px-4 py-2.5 text-zinc-500 select-none text-sm font-mono">
              /app/{organization.slug}
            </div>
            <p className="text-[11px] text-zinc-500">
              Note: Changing organization name will update the URL slug. Active sessions and
              bookmarks might be disrupted.
            </p>
          </div>

          {updateError && (
            <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-400 text-sm">
              {updateError}
            </div>
          )}

          {updateSuccess && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-emerald-400 text-sm">
              Organization name updated successfully!
            </div>
          )}

          {canManage && (
            <button
              type="submit"
              disabled={isUpdating || orgName.trim() === organization.name}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isUpdating && <RefreshCw className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          )}

          {!canManage && (
            <p className="text-xs text-amber-500/80">
              Only organization admins or owners can change these settings.
            </p>
          )}
        </form>
      </section>

      {/* Danger Zone Section */}
      <section className="border-t border-zinc-800/80 pt-8 space-y-6">
        <div className="border border-rose-900/40 rounded-xl bg-rose-950/5 p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-rose-950/50 border border-rose-900/40 rounded-lg text-rose-500 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-400">Danger Zone</h3>
              <p className="text-zinc-400 text-sm mt-1">
                Irreversible administrative actions for this organization.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-zinc-800/50 pt-4 gap-4">
            <div>
              <h4 className="font-semibold text-white text-sm">Delete this Organization</h4>
              <p className="text-zinc-500 text-xs mt-0.5">
                Once deleted, all projects, api keys, issues, alerts, and historical event telemetry
                are permanently soft-deleted.
              </p>
            </div>
            {isOwner ? (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="px-4 py-2 bg-rose-900/20 hover:bg-rose-600 border border-rose-900/80 text-rose-400 hover:text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Organization
              </button>
            ) : (
              <p className="text-xs text-rose-500/80 max-w-xs sm:text-right">
                Only the organization Owner can delete this organization.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Confirm Deletion Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="text-rose-500 h-6 w-6" />
                Are you absolutely sure?
              </h3>
              <p className="text-zinc-400 text-sm">
                This action cannot be undone. All projects and event feeds in this organization will
                be soft-deleted.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Please type{" "}
                  <span className="text-rose-400 font-mono select-all">{organization.slug}</span> to
                  confirm
                </label>
                <input
                  type="text"
                  placeholder={organization.slug}
                  value={confirmSlug}
                  onChange={(e) => setConfirmSlug(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-700 font-mono text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-400 text-sm">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmSlug("");
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || confirmSlug !== organization.slug}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900/30 disabled:text-rose-400/50 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                >
                  {isDeleting && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Delete Organization
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
