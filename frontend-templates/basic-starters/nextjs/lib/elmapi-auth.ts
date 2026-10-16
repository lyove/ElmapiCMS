import { createClient } from "@elmapicms/js-sdk";

/** Auth client without the project API key (identity-only). */
export function createAuthClient(session?: {
  accessToken?: string;
  refreshToken?: string;
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
