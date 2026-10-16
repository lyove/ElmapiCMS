import { createClient } from "@elmapicms/js-sdk";

export const elmapi = createClient({
  baseUrl: process.env.ELMAPI_BASE_URL!,
  projectId: process.env.ELMAPI_PROJECT_ID!,
  apiKey: process.env.ELMAPI_API_KEY!,
});
