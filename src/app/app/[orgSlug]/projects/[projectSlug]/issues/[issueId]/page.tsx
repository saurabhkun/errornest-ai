import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { IssueDetailClient } from "./IssueDetailClient";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; issueId: string }>;
}) {
  const { orgSlug, projectSlug, issueId } = await params;
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

  // Get active organization members
  const memberships = await db.membership.findMany({
    where: { organizationId: org.id, status: "ACTIVE" },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: { user: { displayName: "asc" } },
  });

  const members = memberships.map((m) => ({
    id: m.user.id,
    displayName: m.user.displayName,
    email: m.user.email,
  }));

  return (
    <IssueDetailClient
      org={{ id: org.id, slug: org.slug }}
      project={{ id: project.id, name: project.name, slug: project.slug }}
      issueId={issueId}
      members={members}
    />
  );
}
