import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { ReleasesClient } from "./ReleasesClient";

export default async function ReleasesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
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
  });

  const serializedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
  }));

  return (
    <ReleasesClient
      org={{ id: org.id, name: org.name, slug: org.slug }}
      projects={serializedProjects}
    />
  );
}
