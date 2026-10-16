import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    authError?: string;
    user: DefaultSession["user"] & {
      id?: string;
    };
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
    authError?: string;
  }
}
