import React from "react";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ProfileSettingsClient } from "./ProfileSettingsClient";

export default async function ProfileSettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <ProfileSettingsClient
      user={{
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      }}
    />
  );
}
