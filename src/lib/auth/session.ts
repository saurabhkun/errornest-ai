import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";

export async function getSessionUser() {
  const session = await auth();
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id, deletedAt: null },
    });
    if (user) return user;
  }

  // Fallback to the first active user (Demo User) during M2 local testing
  const fallbackUser = await db.user.findFirst({
    where: { deletedAt: null },
  });
  if (!fallbackUser) {
    throw new Error(
      "No active users found in the database. Please run migrations and seed first."
    );
  }
  return fallbackUser;
}

export async function getSessionOrg(userId: string) {
  // Find the first active organization membership for the user
  const membership = await db.membership.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { organization: true },
  });
  if (!membership) {
    throw new Error("User does not belong to any active organization.");
  }
  return membership.organization;
}
