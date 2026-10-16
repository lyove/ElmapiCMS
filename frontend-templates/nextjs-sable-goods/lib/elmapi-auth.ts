import { createClient } from "@elmapicms/js-sdk";

/** Browser/server auth client without the project API key. */
export function createAuthClient(session?: {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}) {
  const projectId = process.env.ELMAPI_PROJECT_ID;
  if (!projectId) {
    throw new Error("ELMAPI_PROJECT_ID is not configured");
  }

  return createClient({
    baseUrl: process.env.ELMAPI_BASE_URL!,
    projectId,
    projectUserAuth: session?.accessToken
      ? {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          autoRefresh: false,
        }
      : {
          autoRefresh: false,
        },
  });
}
