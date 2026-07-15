import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { TeamSettingsClient } from "./TeamSettingsClient";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const org = await db.organization.findFirst({
    where: {
      OR: [{ slug: orgSlug }, { id: orgSlug }],
      deletedAt: null,
    },
  });

  if (!org) redirect("/");

  const membership = await db.membership.findFirst({
    where: { organizationId: org.id, userId: user.id, status: "ACTIVE" },
  });

  if (!membership) redirect("/");

  return (
    <TeamSettingsClient
      org={{ id: org.id, name: org.name, slug: org.slug }}
      currentUser={{ id: user.id, email: user.email, displayName: user.displayName }}
      currentUserRole={membership.role}
    />
  );
}
