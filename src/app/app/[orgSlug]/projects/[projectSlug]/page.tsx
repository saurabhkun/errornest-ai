import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
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

  const project = await db.project.findFirst({
    where: {
      organizationId: org.id,
      OR: [{ slug: projectSlug }, { id: projectSlug }],
      deletedAt: null,
    },
  });

  if (!project) {
    redirect(`/app/${org.slug}/projects`);
  }

  const keys = await db.apiKey.findMany({
    where: { projectId: project.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const environments = await db.environment.findMany({
    where: { projectId: project.id },
    orderBy: { name: "asc" },
  });

  const serializedProject = {
    id: project.id,
    name: project.name,
    slug: project.slug,
    platform: project.platform,
    createdAt: project.createdAt.toISOString(),
  };

  const serializedKeys = keys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    keySuffix: k.keySuffix,
    createdAt: k.createdAt.toISOString(),
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
  }));

  const serializedEnvironments = environments.map((e) => ({
    id: e.id,
    name: e.name,
    isHidden: e.isHidden,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <ProjectDetailClient
      org={{ id: org.id, slug: org.slug }}
      project={serializedProject}
      initialKeys={serializedKeys}
      initialEnvironments={serializedEnvironments}
    />
  );
}
