import type { UserRole } from "@/types/db";

/**
 * Per-role colors, matching the Flutter reference's `_roleColors`
 * (users_section.dart) exactly — kept separate from `lib/status.ts`'s tone
 * system since roles aren't a status concept, just four fixed identities.
 */
export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "#6d5ae6",
  company_admin: "#1565c0",
  manager: "#00695c",
  employee: "#6b7280",
};
