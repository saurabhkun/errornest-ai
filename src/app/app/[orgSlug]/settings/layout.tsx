import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, ShieldAlert, User, Bell, FileText } from "lucide-react";

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
  const { orgSlug } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const org = await db.organization.findFirst({
    where: {
      OR: [{ slug: orgSlug }, { id: orgSlug }],
      deletedAt: null,
    },
  });

  if (!org) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <div className="max-w-6xl w-full mx-auto px-4 py-8 md:py-12 flex-1 flex flex-col gap-8">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Settings className="h-8 w-8 text-emerald-500 animate-[spin_8s_linear_infinite]" />
              Settings
            </h1>
            <p className="text-zinc-400 mt-2 text-sm">
              Manage settings and view security audit logs for <span className="text-emerald-400 font-semibold">{org.name}</span>
            </p>
          </div>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-zinc-800 pb-2 lg:pb-0 lg:pr-6 gap-2 shrink-0 scrollbar-none">
            <Link
              href={`/app/${org.slug}/settings`}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 whitespace-nowrap"
            >
              <ShieldAlert className="h-4.5 w-4.5 text-zinc-500" />
              General & Organization
            </Link>

            <Link
              href={`/app/${org.slug}/settings/profile`}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 whitespace-nowrap"
            >
              <User className="h-4.5 w-4.5 text-zinc-500" />
              User Profile
            </Link>

            <Link
              href={`/app/${org.slug}/settings/notification-preferences`}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 whitespace-nowrap"
            >
              <Bell className="h-4.5 w-4.5 text-zinc-500" />
              Notification Preferences
            </Link>

            <Link
              href={`/app/${org.slug}/settings/audit`}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 whitespace-nowrap"
            >
              <FileText className="h-4.5 w-4.5 text-zinc-500" />
              Security Audit Log
            </Link>
          </nav>

          {/* Main settings content window */}
          <div className="flex-1 w-full bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 lg:p-8 backdrop-blur-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
