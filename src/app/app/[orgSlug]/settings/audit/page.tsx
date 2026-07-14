import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { AuditLogClient } from "./AuditLogClient";

export default async function AuditLogPage({
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

  const { organization } = membership;

  return <AuditLogClient orgId={organization.id} />;
}
