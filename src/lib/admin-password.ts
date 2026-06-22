import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_ACCESS_COOKIE = "brainwave_admin_access";
export const ADMIN_ACCESS_VALUE = "brainwave_admin_ok";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "1988";
}

export async function hasAdminPasswordAccess() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_ACCESS_COOKIE)?.value === ADMIN_ACCESS_VALUE;
}

export async function requireAdminPasswordAccess(next = "/admin") {
  if (await hasAdminPasswordAccess()) return;
  redirect(`/admin-login?next=${encodeURIComponent(next)}`);
}
