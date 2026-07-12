import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { SdkSetupClient } from "./SdkSetupClient";

export default async function SdkSetupPage({
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
      OR: [
        { slug: orgSlug },
        { id: orgSlug }
      ]
    },
  });

  if (!org) {
    redirect("/");
  }

  const project = await db.project.findFirst({
    where: {
      organizationId: org.id,
      OR: [
        { slug: projectSlug },
        { id: projectSlug }
      ],
      deletedAt: null,
    },
  });

  if (!project) {
    redirect(`/app/${org.slug}/projects`);
  }

  // Grab the first active API key prefix/suffix to use as a placeholder in the code snippet
  const activeKey = await db.apiKey.findFirst({
    where: { projectId: project.id, revokedAt: null },
  });

  const keyPlaceholder = activeKey
    ? `${activeKey.keyPrefix}••••••••••••${activeKey.keySuffix}`
    : "en_live_your_project_api_key_here";

  return (
    <SdkSetupClient
      org={{ slug: org.slug }}
      project={{
        id: project.id,
        name: project.name,
        slug: project.slug,
        platform: project.platform,
      }}
      keyPlaceholder={keyPlaceholder}
    />
  );
}
