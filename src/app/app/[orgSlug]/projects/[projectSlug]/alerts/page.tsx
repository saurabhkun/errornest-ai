import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { AlertRulesClient } from "./AlertRulesClient";

export default async function ProjectAlertRulesPage({
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

  const environments = await db.environment.findMany({
    where: { projectId: project.id },
    orderBy: { name: "asc" },
  });

  const rules = await db.alertRule.findMany({
    where: { projectId: project.id },
    include: {
      environment: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedProject = {
    id: project.id,
    name: project.name,
    slug: project.slug,
    platform: project.platform,
    createdAt: project.createdAt.toISOString(),
  };

  const serializedEnvironments = environments.map((env) => ({
    id: env.id,
    name: env.name,
  }));

  const serializedRules = rules.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    environmentId: r.environmentId,
    minimumLevel: r.minimumLevel,
    thresholdCount: r.thresholdCount,
    thresholdWindowSeconds: r.thresholdWindowSeconds,
    cooldownSeconds: r.cooldownSeconds,
    isActive: r.isActive,
    lastTriggeredAt: r.lastTriggeredAt ? r.lastTriggeredAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    environment: r.environment ? { id: r.environment.id, name: r.environment.name } : null,
  }));

  return (
    <AlertRulesClient
      org={{ id: org.id, slug: org.slug }}
      project={serializedProject}
      environments={serializedEnvironments}
      initialRules={serializedRules}
    />
  );
}
