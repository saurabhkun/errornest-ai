import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const org = await db.organization.findFirst({
    where: {
      OR: [{ slug: orgSlug }, { id: orgSlug }],
    },
  });

  if (!org) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-500">Organization Not Found</h1>
          <p className="mt-2 text-zinc-400">
            We couldn&apos;t find the organization: &quot;{orgSlug}&quot;
          </p>
        </div>
      </div>
    );
  }

  // Get user projects for the switcher
  const projects = await db.project.findMany({
    where: { organizationId: org.id, deletedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans antialiased">
      {/* Sidebar Component */}
      <Sidebar org={{ id: org.id, name: org.name, slug: org.slug }} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar Component */}
        <Topbar
          org={{ id: org.id, name: org.name, slug: org.slug }}
          projects={projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug }))}
          user={{
            displayName: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl,
          }}
        />

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
          <div className="max-w-6xl w-full mx-auto pb-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
