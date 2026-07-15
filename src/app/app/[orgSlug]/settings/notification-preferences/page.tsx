import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { NotificationType } from "@prisma/client";
import { NotificationPreferencesClient } from "./NotificationPreferencesClient";

export default async function NotificationPreferencesPage({
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
      OR: [{ slug: orgSlug }, { id: orgSlug }],
    },
  });

  if (!org) {
    redirect("/");
  }

  const existing = await db.notificationPreference.findMany({
    where: { userId: user.id },
  });

  const types = Object.values(NotificationType);
  const initialPreferences = types.map((t) => {
    const found = existing.find((p) => p.type === t);
    return {
      type: t,
      inAppEnabled: found ? found.inAppEnabled : true,
      emailEnabled: found ? found.emailEnabled : true,
    };
  });

  return <NotificationPreferencesClient initialPreferences={initialPreferences} />;
}
