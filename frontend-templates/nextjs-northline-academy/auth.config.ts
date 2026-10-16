import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config for `proxy.ts`.
 * Do not import `@elmapicms/js-sdk` here — Netlify bundles proxy as an edge handler.
 * Node-only providers and JWT refresh live in `auth.ts`.
 */
export default {
  trustHost: true,
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
      }
      session.accessToken = token.accessToken as string | undefined;
      session.authError = token.authError as string | undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
