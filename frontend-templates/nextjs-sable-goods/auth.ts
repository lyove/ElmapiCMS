import { createClient } from "@elmapicms/js-sdk";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { authUserFromMe } from "@/lib/auth-user";

function elmapiClient() {
  const projectId = process.env.ELMAPI_PROJECT_ID;
  if (!projectId) return null;
  return createClient({
    baseUrl: process.env.ELMAPI_BASE_URL!,
    projectId,
  });
}

async function refreshElmapiToken(token: {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  [key: string]: unknown;
}) {
  const projectId = process.env.ELMAPI_PROJECT_ID;
  if (!projectId || !token.refreshToken) {
    return { ...token, authError: "refresh_unavailable" };
  }

  const client = createClient({
    baseUrl: process.env.ELMAPI_BASE_URL!,
    projectId,
    projectUserAuth: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      autoRefresh: false,
    },
  });

  try {
    const refreshed = await client.refreshSession();
    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: refreshed.expires_at,
      authError: undefined,
    };
  } catch {
    return { ...token, authError: "refresh_failed" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "elmapi",
      name: "Elmapi",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        accessToken: { label: "Access Token", type: "text" },
        refreshToken: { label: "Refresh Token", type: "text" },
        expiresAt: { label: "Expires At", type: "text" },
        name: { label: "Name", type: "text" },
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        const accessToken = String(credentials?.accessToken ?? "").trim();
        if (accessToken) {
          const email = String(credentials?.email ?? "").trim();
          if (!email) return null;
          return {
            id: String(credentials?.userId ?? email),
            email,
            name: (credentials?.name as string | undefined) || undefined,
            accessToken,
            refreshToken: String(credentials?.refreshToken ?? ""),
            expiresAt: String(credentials?.expiresAt ?? ""),
          };
        }

        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const client = elmapiClient();
        if (!client) return null;

        try {
          const result = await client.signInWithPassword({ email, password });
          const me = authUserFromMe(
            (await client.me()) as Record<string, unknown>,
          );

          return {
            id: String(me.uuid ?? me.id ?? email),
            email: String(me.email ?? email),
            name: (me.display_name as string | undefined) ?? undefined,
            accessToken: result.access_token,
            refreshToken: result.refresh_token ?? "",
            expiresAt: result.expires_at,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.expiresAt = user.expiresAt;
        token.authError = undefined;
        return token;
      }

      if (!token.expiresAt) return token;

      const isExpired =
        Date.now() >= new Date(String(token.expiresAt)).getTime();
      if (!isExpired) return token;

      return refreshElmapiToken(token);
    },
  },
});
