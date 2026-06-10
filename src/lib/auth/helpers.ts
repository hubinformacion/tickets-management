import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { AppSession } from "@/types";

/**
 * Gets the current session if it exists.
 * Wrapped with React.cache() to deduplicate multiple calls
 * within the same server request (e.g. layout + page + server action).
 * @returns Session object or null if not authenticated
 */
export const getSession = cache(async (): Promise<AppSession | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session as AppSession | null;
});

/**
 * Requires authentication. Redirects if user is not authenticated or is inactive.
 * @returns Session object
 * @throws Redirects if not authenticated or user is deactivated
 */
export async function requireAuth(): Promise<AppSession> {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin?error=unauthorized");
  }

  // Check if user is active
  if (!session.user.isActive) {
    redirect("/auth/signin?error=user_deactivated");
  }

  return session;
}

/**
 * Requires admin role. Redirects if user is not an admin.
 * @returns Session object with admin user
 * @throws Redirects if not authenticated or not an admin
 */
export async function requireAdmin(): Promise<AppSession> {
  const session = await requireAuth();

  if (session.user.role !== "admin") {
    redirect("/dashboard?error=forbidden");
  }

  return session;
}

/**
 * Requires agent or admin role. Redirects if unauthorized.
 * @returns Session object
 */
export async function requireAgent(): Promise<AppSession> {
  const session = await requireAuth();

  if (session.user.role !== "agent" && session.user.role !== "admin") {
    redirect("/dashboard?error=forbidden");
  }

  return session;
}
