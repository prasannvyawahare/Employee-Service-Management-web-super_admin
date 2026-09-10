/**
 * Postgrest may return a to-one embedded relation as a single object or a
 * one-item array depending on whether it infers the underlying UNIQUE
 * constraint — same defensiveness as the Flutter reference's `_subscription`
 * helpers (e.g. `company_detail_screen.dart`).
 */
export function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
