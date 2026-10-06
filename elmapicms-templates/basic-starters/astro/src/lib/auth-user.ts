/**
 * `client.me()` returns `{ user: { uuid, email, display_name, ... } }`.
 * Normalize that payload (and tolerate a bare user object if the shape changes).
 */
export function authUserFromMe(payload: unknown): {
  id: string;
  email: string;
  name?: string;
} {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const user =
    root.user && typeof root.user === "object"
      ? (root.user as Record<string, unknown>)
      : root;

  const name =
    typeof user.display_name === "string" ? user.display_name : undefined;

  return {
    id: String(user.uuid ?? user.id ?? ""),
    email: String(user.email ?? ""),
    name,
  };
}
