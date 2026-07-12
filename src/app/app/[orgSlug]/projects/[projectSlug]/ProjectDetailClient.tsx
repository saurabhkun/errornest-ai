"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as ErrorNestSDK from "@errornest/sdk";
import {
  Key,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ShieldAlert,
  ChevronRight,
  Code,
  AlertTriangle,
  X,
  Plus,
} from "lucide-react";

interface SerializedKey {
  id: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface ProjectDetailClientProps {
  org: {
    id: string;
    slug: string;
  };
  project: {
    id: string;
    name: string;
    slug: string;
    platform: string;
    createdAt: string;
  };
  initialKeys: SerializedKey[];
}

export function ProjectDetailClient({ org, project, initialKeys }: ProjectDetailClientProps) {
  const router = useRouter();
  const [keys, setKeys] = useState<SerializedKey[]>(initialKeys);

  // States for key creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // States for rotation / revocation / deletion
  const [rotatingKey, setRotatingKey] = useState<SerializedKey | null>(null);
  const [revokingKey, setRevokingKey] = useState<SerializedKey | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // States for sending test error
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSendTestError = async () => {
    setIsSendingTest(true);
    setTestSendResult(null);

    let tempKeyId: string | null = null;
    try {
      // 1. Create a temporary key
      const createRes = await fetch(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Temporary Dashboard Test Key" }),
      });

      const createBody = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createBody.error?.message || "Failed to create temporary API key");
      }

      const { id: keyId, rawKey } = createBody.data;
      tempKeyId = keyId;

      // 2. Initialize SDK
      ErrorNestSDK.init({
        apiKey: rawKey,
        endpoint: `${window.location.origin}/api/v1/ingest/events`,
        environment: "production",
        release: "1.0.0-test",
      });

      // 3. Send test error
      const testError = new Error(
        "This is a live test error generated from the ErrorNest Dashboard!"
      );
      testError.name = "TestException";

      ErrorNestSDK.captureException(testError, {
        level: "warning",
        tags: {
          source: "dashboard_test_button",
        },
        user: {
          id: "usr_test_123",
          email: "test-user@errornest.com",
        },
      });

      await ErrorNestSDK.flush();

      // 4. Revoke/delete the temporary key
      await fetch(`/api/v1/projects/${project.id}/keys/${tempKeyId}`, {
        method: "DELETE",
      });

      setTestSendResult({
        success: true,
        message: "Test error successfully captured and sent to the ingestion endpoint!",
      });

      // Refresh list to show potential key lastUsed updates
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to send test error";
      setTestSendResult({
        success: false,
        message: msg,
      });

      // Clean up key if it was created
      if (tempKeyId) {
        await fetch(`/api/v1/projects/${project.id}/keys/${tempKeyId}`, {
          method: "DELETE",
        }).catch(console.error);
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to create API key");
      }

      const newKey = body.data;
      setCreatedRawKey(newKey.rawKey);
      setKeys([
        {
          id: newKey.id,
          name: newKey.name,
          keyPrefix: newKey.keyPrefix,
          keySuffix: newKey.keySuffix,
          createdAt: newKey.createdAt,
          lastUsedAt: null,
        },
        ...keys,
      ]);
      setNewKeyName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRotateKey = async () => {
    if (!rotatingKey) return;
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/v1/projects/${project.id}/keys/${rotatingKey.id}/rotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to rotate API key");
      }

      const rotated = body.data;
      setCreatedRawKey(rotated.rawKey);
      setKeys(
        keys
          .filter((k) => k.id !== rotatingKey.id)
          .concat({
            id: rotated.id,
            name: rotated.name,
            keyPrefix: rotated.keyPrefix,
            keySuffix: rotated.keySuffix,
            createdAt: rotated.createdAt,
            lastUsedAt: null,
          })
      );
      setRotatingKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!revokingKey) return;
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/v1/projects/${project.id}/keys/${revokingKey.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to revoke API key");
      }

      setKeys(keys.filter((k) => k.id !== revokingKey.id));
      setRevokingKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to delete project");
      }

      router.push(`/app/${org.slug}/projects`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsLoading(false);
      setIsDeletingProject(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href={`/app/${org.slug}/projects`} className="hover:text-zinc-200 transition-colors">
          Projects
        </Link>
        <ChevronRight className="h-3 w-3 text-zinc-600" />
        <span className="text-zinc-200 font-medium">{project.name}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">{project.name}</h1>
            <span className="px-2.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 uppercase">
              {project.platform}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Configure SDK keys and view settings for integration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSendTestError}
            disabled={isSendingTest}
            className="flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 hover:text-white font-medium text-sm px-4 py-2 rounded-lg cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isSendingTest ? "animate-spin" : ""}`} />
            <span>{isSendingTest ? "Sending Test..." : "Send Test Error"}</span>
          </button>
          <Link
            href={`/app/${org.slug}/projects/${project.slug}/sdk-setup`}
            className="flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Code className="h-4 w-4" />
            <span>SDK Instructions</span>
          </Link>
        </div>
      </div>

      {testSendResult && (
        <div
          className={`p-4 rounded-lg border flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-255 ${
            testSendResult.success
              ? "bg-emerald-950/20 border-emerald-900/60 text-emerald-400"
              : "bg-red-950/20 border-red-900/60 text-red-400"
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{testSendResult.message}</span>
          </div>
          <button
            onClick={() => setTestSendResult(null)}
            className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      )}

      {/* Secondary Settings Tabs */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-6">
          <button className="border-b-2 border-emerald-500 pb-3 text-sm font-semibold text-white">
            API Keys
          </button>
          <Link
            href={`/app/${org.slug}/projects/${project.slug}/issues`}
            className="pb-3 text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Issues List
          </Link>
          <div className="pb-3 text-sm text-zinc-550 cursor-not-allowed select-none">
            General Settings (Coming soon)
          </div>
        </div>
      </div>

      {/* Keys Management Card */}
      <div className="border border-zinc-800 bg-zinc-900/35 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Project API Keys</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Use these keys to authenticate events sent to ErrorNest from the SDK.
            </p>
          </div>
          <button
            onClick={() => {
              setCreatedRawKey(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Generate Key</span>
          </button>
        </div>

        {keys.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Key className="h-10 w-10 text-zinc-500 mb-4" />
            <h3 className="text-sm font-semibold text-white">No active API keys</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              Generate an API key to allow the ErrorNest SDK to send error payloads from your code.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/20 text-zinc-400 font-medium">
                  <th className="p-4">Name</th>
                  <th className="p-4">Token Preview</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4">Last Used</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-zinc-900/20">
                    <td className="p-4 font-semibold text-white">{k.name}</td>
                    <td className="p-4">
                      <code className="bg-zinc-950 px-2 py-1 rounded text-zinc-400 font-mono">
                        {k.keyPrefix}••••••••••••{k.keySuffix}
                      </code>
                    </td>
                    <td className="p-4 text-zinc-400">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-zinc-400">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setCreatedRawKey(null);
                          setRotatingKey(k);
                        }}
                        className="p-1.5 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                        title="Rotate key"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setRevokingKey(k)}
                        className="p-1.5 rounded border border-red-950 hover:border-red-900 bg-red-950/20 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dangerous Actions Area */}
      <div className="border border-red-900/40 bg-red-950/5 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-red-400">Destructive Actions</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Permanently delete this project. All associated issues, events, API keys, and
            configurations will be immediately soft-deleted.
          </p>
        </div>
        <button
          onClick={() => setIsDeletingProject(true)}
          className="bg-red-950/60 border border-red-800/80 hover:bg-red-900/80 text-red-200 text-xs font-semibold px-4.5 py-2 rounded-lg cursor-pointer transition-colors"
        >
          Delete Project
        </button>
      </div>

      {/* Create Key Modal */}
      {isCreateModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-lg font-bold text-white">Generate API Key</h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 cursor-pointer"
                  disabled={isLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {createdRawKey ? (
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-amber-200 text-xs leading-normal">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Copy this API key now!</p>
                      <p className="text-amber-300 mt-1">
                        For security reasons, this key will not be shown again. Save it securely to
                        configure your SDK.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">
                      Plain-text API Key
                    </label>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-zinc-950 px-3 py-2 rounded-lg text-emerald-400 font-mono text-sm break-all border border-zinc-800 select-all">
                        {createdRawKey}
                      </code>
                      <button
                        onClick={() => handleCopyKey(createdRawKey)}
                        className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 p-2.5 rounded-lg cursor-pointer transition-colors"
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/80 flex justify-end">
                    <button
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white rounded-lg cursor-pointer transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateKey} className="p-6 space-y-4">
                  {error && (
                    <div className="flex items-start gap-3 p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-red-200 text-xs">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="key-name" className="text-xs font-semibold text-zinc-300">
                      API Key Name
                    </label>
                    <input
                      id="key-name"
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g. Production Ingestion Key"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-300 hover:text-white rounded-lg cursor-pointer"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-white rounded-lg cursor-pointer"
                      disabled={isLoading}
                    >
                      {isLoading ? "Generating..." : "Generate API Key"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}

      {/* Rotate Key Confirmation Modal */}
      {rotatingKey && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>Rotate API Key</span>
                </h2>
                <button
                  onClick={() => setRotatingKey(null)}
                  className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 cursor-pointer"
                  disabled={isLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {createdRawKey ? (
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-emerald-200 text-xs">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Copy your new API key now!</p>
                      <p className="text-emerald-300 mt-1">
                        The old key has been revoked. Save this new key securely.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">New API Key</label>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-zinc-950 px-3 py-2 rounded-lg text-emerald-400 font-mono text-sm break-all border border-zinc-800 select-all">
                        {createdRawKey}
                      </code>
                      <button
                        onClick={() => handleCopyKey(createdRawKey)}
                        className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 p-2.5 rounded-lg cursor-pointer"
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/80 flex justify-end">
                    <button
                      onClick={() => setRotatingKey(null)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white rounded-lg cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {error && (
                    <div className="flex items-start gap-3 p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-red-200 text-xs">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <p className="text-sm text-zinc-300 leading-normal">
                    Are you sure you want to rotate the API key{" "}
                    <span className="font-semibold text-white">&quot;{rotatingKey.name}&quot;</span>
                    ?
                  </p>
                  <p className="text-xs text-zinc-500 leading-normal">
                    Any server or client actively using this key will immediately start failing to
                    ingest errors until updated with the new rotated key value.
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80 mt-6">
                    <button
                      onClick={() => setRotatingKey(null)}
                      className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-300 hover:text-white rounded-lg cursor-pointer"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRotateKey}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-sm font-medium text-white rounded-lg cursor-pointer flex items-center gap-1.5"
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>{isLoading ? "Rotating..." : "Rotate Key"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Revoke Key Confirmation Modal */}
      {revokingKey && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span>Revoke API Key</span>
                </h2>
                <button
                  onClick={() => setRevokingKey(null)}
                  className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 cursor-pointer"
                  disabled={isLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-3 p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-red-200 text-xs">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <p className="text-sm text-zinc-300 leading-normal">
                  Are you sure you want to permanently revoke the API key{" "}
                  <span className="font-semibold text-white">&quot;{revokingKey.name}&quot;</span>?
                </p>
                <p className="text-xs text-red-400/90 leading-normal">
                  This action is irreversible and the token will no longer be allowed to write event
                  ingestion payloads.
                </p>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80 mt-6">
                  <button
                    onClick={() => setRevokingKey(null)}
                    className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-300 hover:text-white rounded-lg cursor-pointer"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRevokeKey}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-medium text-white rounded-lg cursor-pointer"
                    disabled={isLoading}
                  >
                    {isLoading ? "Revoking..." : "Revoke Key"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Project Confirmation Modal */}
      {isDeletingProject && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-red-900 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-red-950/10">
                <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Delete Project</span>
                </h2>
                <button
                  onClick={() => setIsDeletingProject(false)}
                  className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 cursor-pointer"
                  disabled={isLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-3 p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-red-200 text-xs">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <p className="text-sm text-zinc-300 leading-normal">
                  This will delete the project{" "}
                  <span className="font-semibold text-white">&quot;{project.name}&quot;</span> and
                  all of its associated logs and ingestion configurations.
                </p>
                <p className="text-xs text-red-400 leading-normal font-semibold">
                  This action is final. Make sure you have detached the SDK before deleting.
                </p>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80 mt-6">
                  <button
                    onClick={() => setIsDeletingProject(false)}
                    className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-300 hover:text-white rounded-lg cursor-pointer"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-sm font-medium text-white rounded-lg cursor-pointer"
                    disabled={isLoading}
                  >
                    {isLoading ? "Deleting..." : "Delete Project"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
