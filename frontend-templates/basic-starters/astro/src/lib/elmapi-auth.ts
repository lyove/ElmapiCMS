import { createClient } from "@elmapicms/js-sdk";
import { ELMAPI_BASE_URL, ELMAPI_PROJECT_ID } from "astro:env/server";

/** Auth client for project-user identity (no API key). */
export function createAuthClient(session?: {
  accessToken?: string;
  refreshToken?: string;
}) {
  if (!ELMAPI_PROJECT_ID) {
    throw new Error("ELMAPI_PROJECT_ID is not configured");
  }

  return createClient({
    baseUrl: ELMAPI_BASE_URL,
    projectId: ELMAPI_PROJECT_ID,
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
