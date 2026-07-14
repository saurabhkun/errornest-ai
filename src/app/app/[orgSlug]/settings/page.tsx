import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { GeneralSettingsClient } from "./GeneralSettingsClient";

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const membership = await db.membership.findFirst({
    where: {
      organization: {
        OR: [{ slug: orgSlug }, { id: orgSlug }],
      },
      userId: user.id,
      status: "ACTIVE",
    },
    include: {
      organization: true,
    },
  });

  if (!membership || membership.organization.deletedAt) {
    redirect("/");
  }

  const { organization, role } = membership;

  return (
    <GeneralSettingsClient
      organization={{
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      }}
      userRole={role}
    />
  );
}
