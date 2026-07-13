"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  ChevronRight,
  X,
  Bell,
  Clock,
  Sliders,
} from "lucide-react";
import { AlertType, EventLevel } from "@prisma/client";

interface SerializedEnvironment {
  id: string;
  name: string;
}

interface SerializedRule {
  id: string;
  name: string;
  type: AlertType;
  environmentId: string | null;
  minimumLevel: EventLevel | null;
  thresholdCount: number | null;
  thresholdWindowSeconds: number | null;
  cooldownSeconds: number;
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  environment: { id: string; name: string } | null;
}

interface AlertRulesClientProps {
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
  environments: SerializedEnvironment[];
  initialRules: SerializedRule[];
}

export function AlertRulesClient({
  org,
  project,
  environments,
  initialRules,
}: AlertRulesClientProps) {
  const router = useRouter();
  const [rules, setRules] = useState<SerializedRule[]>(initialRules);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SerializedRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<SerializedRule | null>(null);

  // Form States
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState<AlertType>("NEW_ISSUE");
  const [envId, setEnvId] = useState<string>("all");
  const [minLevel, setMinLevel] = useState<string>("all");
  const [thresholdCount, setThresholdCount] = useState<number>(50);
  const [thresholdWindow, setThresholdWindow] = useState<number>(300);
  const [cooldown, setCooldown] = useState<number>(300);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setRuleName("");
    setRuleType("NEW_ISSUE");
    setEnvId("all");
    setMinLevel("all");
    setThresholdCount(50);
    setThresholdWindow(300);
    setCooldown(300);
    setError("");
  };

  const openCreateModal = () => {
    setEditingRule(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (rule: SerializedRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleType(rule.type);
    setEnvId(rule.environmentId || "all");
    setMinLevel(rule.minimumLevel || "all");
    setThresholdCount(rule.thresholdCount || 50);
    setThresholdWindow(rule.thresholdWindowSeconds || 300);
    setCooldown(rule.cooldownSeconds);
    setError("");
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    setIsLoading(true);
    setError("");

    const payload = {
      name: ruleName,
      type: ruleType,
      environmentId: envId === "all" ? null : envId,
      minimumLevel: minLevel === "all" ? null : minLevel,
      thresholdCount: ruleType === "SPIKE" ? thresholdCount : null,
      thresholdWindowSeconds: ruleType === "SPIKE" ? thresholdWindow : null,
      cooldownSeconds: cooldown,
      isActive: editingRule ? editingRule.isActive : true,
    };

    try {
      const url = editingRule
        ? `/api/v1/alert-rules/${editingRule.id}`
        : `/api/v1/projects/${project.id}/alert-rules`;

      const method = editingRule ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to save alert rule");
      }

      if (editingRule) {
        setRules(rules.map((r) => (r.id === editingRule.id ? body.data : r)));
      } else {
        setRules([body.data, ...rules]);
      }

      setIsModalOpen(false);
      resetForm();
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (rule: SerializedRule) => {
    try {
      const res = await fetch(`/api/v1/alert-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to update rule status");
      }

      setRules(rules.map((r) => (r.id === rule.id ? body.data : r)));
      router.refresh();
    } catch (err: unknown) {
      console.error("Toggle rule failed:", err);
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRule) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/alert-rules/${deletingRule.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || "Failed to delete alert rule");
      }

      setRules(rules.filter((r) => r.id !== deletingRule.id));
      setDeletingRule(null);
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
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
        <Link
          href={`/app/${org.slug}/projects/${project.slug}`}
          className="hover:text-zinc-200 transition-colors"
        >
          {project.name}
        </Link>
        <ChevronRight className="h-3 w-3 text-zinc-600" />
        <span className="text-zinc-200 font-medium">Alert Rules</span>
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
            Configure system rules to trigger alerts when error activities occur.
          </p>
        </div>
        <div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-lg shadow-emerald-950/20"
          >
            <Plus className="h-4 w-4" />
            <span>Create Alert Rule</span>
          </button>
        </div>
      </div>

      {/* Secondary Settings Tabs */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-6">
          <Link
            href={`/app/${org.slug}/projects/${project.slug}`}
            className="pb-3 text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            API Keys
          </Link>
          <Link
            href={`/app/${org.slug}/projects/${project.slug}/issues`}
            className="pb-3 text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Issues List
          </Link>
          <button className="border-b-2 border-emerald-500 pb-3 text-sm font-semibold text-white">
            Alert Rules
          </button>
          <div className="pb-3 text-sm text-zinc-550 cursor-not-allowed select-none">
            General Settings (Coming soon)
          </div>
        </div>
      </div>

      {/* Alert Rules List */}
      <div className="border border-zinc-800 bg-zinc-900/35 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Notification Alert Rules</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Alerts will trigger emails and in-app notifications for all organization members.
          </p>
        </div>

        {rules.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">No alert rules configured</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Create alert rules to ensure your team is notified immediately when error trends spike
              or new critical bugs emerge.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-6 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Configure First Rule
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/20 text-zinc-400 font-medium">
                  <th className="p-4 pl-6">Status</th>
                  <th className="p-4">Rule Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Scoping Conditions</th>
                  <th className="p-4">Cooldown</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {rules.map((rule) => {
                  const windowMinutes = rule.thresholdWindowSeconds
                    ? Math.round((rule.thresholdWindowSeconds / 60) * 10) / 10
                    : null;
                  return (
                    <tr
                      key={rule.id}
                      className={`hover:bg-zinc-900/20 transition-colors ${
                        !rule.isActive ? "opacity-60" : ""
                      }`}
                    >
                      <td className="p-4 pl-6">
                        <button
                          onClick={() => handleToggleActive(rule)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            rule.isActive ? "bg-emerald-600" : "bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              rule.isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="p-4 font-semibold text-white">{rule.name}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                            rule.type === "NEW_ISSUE"
                              ? "bg-blue-950/40 border border-blue-900/60 text-blue-400"
                              : rule.type === "REGRESSION"
                                ? "bg-red-950/40 border border-red-900/60 text-red-400"
                                : "bg-amber-950/40 border border-amber-900/60 text-amber-400"
                          }`}
                        >
                          {rule.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-zinc-500">Env:</span>
                          <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px]">
                            {rule.environment?.name || "All"}
                          </span>
                          <span className="text-zinc-550">|</span>
                          <span className="text-zinc-500">Min Level:</span>
                          <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px]">
                            {rule.minimumLevel || "Any"}
                          </span>
                        </div>
                        {rule.type === "SPIKE" && (
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <Sliders className="h-3 w-3 text-zinc-500" />
                            <span>
                              Threshold: &gt; {rule.thresholdCount} events in {windowMinutes}{" "}
                              minutes
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-zinc-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{Math.round((rule.cooldownSeconds / 60) * 10) / 10} min</span>
                      </td>
                      <td className="p-4 text-right pr-6 space-x-2">
                        <button
                          onClick={() => openEditModal(rule)}
                          className="p-1.5 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer transition-colors"
                          title="Edit rule"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingRule(rule)}
                          className="p-1.5 rounded border border-red-950 hover:border-red-900 bg-red-950/20 text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Rule Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-lg font-bold text-white">
                  {editingRule ? "Edit Alert Rule" : "Create Alert Rule"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 cursor-pointer"
                  disabled={isLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRule} className="p-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-3 p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-red-200 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="rule-name" className="text-xs font-semibold text-zinc-300">
                    Rule Name
                  </label>
                  <input
                    id="rule-name"
                    type="text"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g. Notify on Production Fatal Errors"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-505 focus:outline-none focus:border-emerald-600"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="rule-type" className="text-xs font-semibold text-zinc-300">
                      Trigger Event
                    </label>
                    <select
                      id="rule-type"
                      value={ruleType}
                      onChange={(e) => setRuleType(e.target.value as AlertType)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-600"
                      disabled={isLoading}
                    >
                      <option value="NEW_ISSUE">New Issue Created</option>
                      <option value="REGRESSION">Regression (Resolved Reopened)</option>
                      <option value="SPIKE">Event Volume Spike</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="cooldown" className="text-xs font-semibold text-zinc-300">
                      Cooldown Window
                    </label>
                    <select
                      id="cooldown"
                      value={cooldown}
                      onChange={(e) => setCooldown(parseInt(e.target.value, 10))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-600"
                      disabled={isLoading}
                    >
                      <option value="0">No Cooldown</option>
                      <option value="60">1 Minute</option>
                      <option value="300">5 Minutes</option>
                      <option value="900">15 Minutes</option>
                      <option value="1800">30 Minutes</option>
                      <option value="3600">1 Hour</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="env-filter" className="text-xs font-semibold text-zinc-300">
                      Environment Filter
                    </label>
                    <select
                      id="env-filter"
                      value={envId}
                      onChange={(e) => setEnvId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-600"
                      disabled={isLoading}
                    >
                      <option value="all">All Environments</option>
                      {environments.map((env) => (
                        <option key={env.id} value={env.id}>
                          {env.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="level-filter" className="text-xs font-semibold text-zinc-300">
                      Minimum Level
                    </label>
                    <select
                      id="level-filter"
                      value={minLevel}
                      onChange={(e) => setMinLevel(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-600"
                      disabled={isLoading}
                    >
                      <option value="all">Any Severity Level</option>
                      <option value="INFO">Info</option>
                      <option value="WARNING">Warning</option>
                      <option value="ERROR">Error</option>
                      <option value="FATAL">Fatal</option>
                    </select>
                  </div>
                </div>

                {ruleType === "SPIKE" && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-950 border border-zinc-800/80 rounded-lg animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="spike-threshold"
                        className="text-xs font-semibold text-zinc-300"
                      >
                        Event Count Threshold
                      </label>
                      <input
                        id="spike-threshold"
                        type="number"
                        min="1"
                        value={thresholdCount}
                        onChange={(e) => setThresholdCount(parseInt(e.target.value, 10))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-600"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="spike-window" className="text-xs font-semibold text-zinc-300">
                        Sliding Time Window
                      </label>
                      <select
                        id="spike-window"
                        value={thresholdWindow}
                        onChange={(e) => setThresholdWindow(parseInt(e.target.value, 10))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-600"
                        disabled={isLoading}
                      >
                        <option value="60">1 Minute</option>
                        <option value="300">5 Minutes</option>
                        <option value="600">10 Minutes</option>
                        <option value="1800">30 Minutes</option>
                        <option value="3600">1 Hour</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-300 hover:text-white rounded-lg cursor-pointer"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-white rounded-lg cursor-pointer shadow-lg shadow-emerald-950/20"
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save Alert Rule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Delete Rule Confirmation Modal */}
      {deletingRule && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-red-900 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-red-955/5">
                <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Delete Alert Rule</span>
                </h2>
                <button
                  onClick={() => setDeletingRule(null)}
                  className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 cursor-pointer"
                  disabled={isLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-3 p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-red-200 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <p className="text-sm text-zinc-300 leading-normal">
                  Are you sure you want to permanently delete the alert rule{" "}
                  <span className="font-semibold text-white">&quot;{deletingRule.name}&quot;</span>?
                </p>
                <p className="text-xs text-red-400 leading-normal font-semibold">
                  This action cannot be undone. Notifications will no longer be dispatched for this
                  rule.
                </p>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80 mt-6">
                  <button
                    onClick={() => setDeletingRule(null)}
                    className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-300 hover:text-white rounded-lg cursor-pointer"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteRule}
                    className="px-4 py-2 bg-red-600 hover:bg-red-550 text-sm font-medium text-white rounded-lg cursor-pointer"
                    disabled={isLoading}
                  >
                    {isLoading ? "Deleting..." : "Delete Rule"}
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
