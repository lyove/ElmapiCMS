/** Elmapi `me()` returns `{ user: { uuid, email, display_name, ... } }`. */
export function authUserFromMe(
  me: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!me) return {};
  const nested = me.user;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return me;
}
