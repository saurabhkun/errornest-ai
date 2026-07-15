import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
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
    redirect("/");
  }

  const projects = await db.project.findMany({
    where: {
      organizationId: org.id,
      deletedAt: null,
    },
    orderBy: {
      name: "asc",
    },
    include: {
      environments: true,
    },
  });

  const serializedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    environments: p.environments.map((e) => ({
      id: e.id,
      name: e.name,
    })),
  }));

  return (
    <DashboardClient
      org={{ id: org.id, name: org.name, slug: org.slug }}
      projects={serializedProjects}
    />
  );
}
