import { createClient } from "@elmapicms/js-sdk";

/**
 * Server-only CMS client with the project API token.
 * Never import this module from client components.
 */
export const elmapi = createClient({
  baseUrl: process.env.ELMAPI_BASE_URL!,
  projectId: process.env.ELMAPI_PROJECT_ID!,
  apiKey: process.env.ELMAPI_API_KEY!,
});
