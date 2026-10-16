import { createClient } from '@elmapicms/js-sdk';
import {
  ELMAPI_API_KEY,
  ELMAPI_BASE_URL,
  ELMAPI_PROJECT_ID,
} from 'astro:env/server';

export const elmapi = createClient({
  baseUrl: ELMAPI_BASE_URL,
  projectId: ELMAPI_PROJECT_ID,
  apiKey: ELMAPI_API_KEY,
});
