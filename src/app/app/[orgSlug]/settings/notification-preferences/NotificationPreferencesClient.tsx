"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, Bell, Mail, Loader2, Check } from "lucide-react";
import { NotificationType } from "@prisma/client";

interface Preference {
  type: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

interface NotificationPreferencesClientProps {
  orgSlug: string;
  initialPreferences: Preference[];
}

const TYPE_DETAILS: Record<NotificationType, { title: string; description: string }> = {
  ALERT: {
    title: "Rule Alerts",
    description:
      "Receive warnings triggered by project alert rules, spikes, and regression events.",
  },
  ASSIGNMENT: {
    title: "Issue Assignments",
    description: "Get notified when another team member assigns an issue to you.",
  },
  MENTION: {
    title: "Comments & Mentions",
    description: "Be alerted when you are tagged or mentioned in issue discussion threads.",
  },
  SYSTEM: {
    title: "System Bulletins",
    description: "Get notices about maintenance, security updates, and org settings changes.",
  },
};

export function NotificationPreferencesClient({
  orgSlug,
  initialPreferences,
}: NotificationPreferencesClientProps) {
  const [preferences, setPreferences] = useState<Preference[]>(initialPreferences);
  const [updatingType, setUpdatingType] = useState<string | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const handleToggle = async (
    type: NotificationType,
    channel: "inAppEnabled" | "emailEnabled",
    currentVal: boolean
  ) => {
    setUpdatingType(`${type}-${channel}`);
    const updatedVal = !currentVal;

    // Optimistic UI update
    setPreferences((prev) =>
      prev.map((p) => (p.type === type ? { ...p, [channel]: updatedVal } : p))
    );

    try {
      const res = await fetch("/api/v1/me/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          [channel]: updatedVal,
        }),
      });

      if (!res.ok) {
        // Rollback on failure
        setPreferences((prev) =>
          prev.map((p) => (p.type === type ? { ...p, [channel]: currentVal } : p))
        );
        console.error("Failed to update preference status");
      } else {
        // Show success indicator
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 2000);
      }
    } catch (err) {
      // Rollback on network error
      setPreferences((prev) =>
        prev.map((p) => (p.type === type ? { ...p, [channel]: currentVal } : p))
      );
      console.error("Failed to update preference:", err);
    } finally {
      setUpdatingType(null);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href={`/app/${orgSlug}/projects`} className="hover:text-zinc-200 transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3 w-3 text-zinc-600" />
        <span className="text-zinc-200 font-medium">Notification Settings</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Notification Preferences</h1>
          <p className="text-sm text-zinc-450 mt-1">
            Choose how and when you want to receive alerts from ErrorNest.
          </p>
        </div>
        {showSavedToast && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950 border border-emerald-800 rounded-lg text-emerald-400 text-xs animate-in fade-in slide-in-from-right-2 duration-150">
            <Check className="h-3.5 w-3.5" />
            <span>Preferences saved</span>
          </div>
        )}
      </div>

      {/* Preferences Panel */}
      <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800/80 bg-zinc-900/10">
          <h2 className="text-base font-bold text-white">Delivery Channels</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure default settings for each type of notification event.
          </p>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {preferences.map((pref) => {
            const details = TYPE_DETAILS[pref.type] || {
              title: pref.type,
              description: "Custom notification category",
            };

            const isInAppLoading = updatingType === `${pref.type}-inAppEnabled`;
            const isEmailLoading = updatingType === `${pref.type}-emailEnabled`;

            return (
              <div
                key={pref.type}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-zinc-900/10 transition-colors"
              >
                <div className="max-w-md">
                  <h3 className="text-sm font-bold text-white">{details.title}</h3>
                  <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
                    {details.description}
                  </p>
                </div>

                <div className="flex items-center gap-8 self-end md:self-center">
                  {/* In App Switch */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5 text-zinc-550" />
                      <span>In-App</span>
                    </span>
                    <button
                      onClick={() => handleToggle(pref.type, "inAppEnabled", pref.inAppEnabled)}
                      disabled={isInAppLoading || isEmailLoading}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        pref.inAppEnabled ? "bg-emerald-600" : "bg-zinc-700"
                      }`}
                    >
                      {isInAppLoading ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-3 w-3 animate-spin text-white" />
                        </span>
                      ) : (
                        <span
                          className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            pref.inAppEnabled ? "translate-x-4.5" : "translate-x-0"
                          }`}
                        />
                      )}
                    </button>
                  </div>

                  {/* Email Switch */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-zinc-550" />
                      <span>Email</span>
                    </span>
                    <button
                      onClick={() => handleToggle(pref.type, "emailEnabled", pref.emailEnabled)}
                      disabled={isInAppLoading || isEmailLoading}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        pref.emailEnabled ? "bg-emerald-600" : "bg-zinc-700"
                      }`}
                    >
                      {isEmailLoading ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-3 w-3 animate-spin text-white" />
                        </span>
                      ) : (
                        <span
                          className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            pref.emailEnabled ? "translate-x-4.5" : "translate-x-0"
                          }`}
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
