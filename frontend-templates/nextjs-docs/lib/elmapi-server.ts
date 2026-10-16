import { createClient } from "@elmapicms/js-sdk";

type ServerClient = ReturnType<typeof createClient>;

/**
 * Server-only CMS client. Never import this from client components.
 */
function createServerClient(): ServerClient {
  const baseUrl = process.env.ELMAPI_BASE_URL;
  const projectId = process.env.ELMAPI_PROJECT_ID;
  const apiKey = process.env.ELMAPI_API_KEY;

  if (!baseUrl || !projectId || !apiKey) {
    throw new Error(
      "Missing Elmapi env: set ELMAPI_BASE_URL, ELMAPI_PROJECT_ID, and ELMAPI_API_KEY (server-only).",
    );
  }

  return createClient({ baseUrl, projectId, apiKey });
}

let client: ServerClient | null = null;

export const elmapi: ServerClient = new Proxy({} as ServerClient, {
  get(_target, prop, receiver) {
    if (!client) client = createServerClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
