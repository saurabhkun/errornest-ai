import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const org = await db.organization.findFirst({
    where: {
      OR: [
        { slug: orgSlug },
        { id: orgSlug }
      ]
    },
  });

  if (!org) {
    redirect("/");
  }

  const projects = await db.project.findMany({
    where: { organizationId: org.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  // map prisma model dates to string representation for next.js serialization
  const serializedProjects = projects.map((p) => ({
    id: p.id,
    organizationId: p.organizationId,
    name: p.name,
    slug: p.slug,
    platform: p.platform,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <ProjectsClient
      org={{ id: org.id, name: org.name, slug: org.slug }}
      initialProjects={serializedProjects}
    />
  );
}
