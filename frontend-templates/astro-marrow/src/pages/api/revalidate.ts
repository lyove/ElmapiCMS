import { createHmac, timingSafeEqual } from 'node:crypto';
import type { APIRoute } from 'astro';
import { REVALIDATE_SECRET } from 'astro:env/server';
import { getCmsCacheGeneration, invalidateCmsCache } from '../../lib/cms-cache';

export const prerender = false;

/**
 * Webhook endpoint for Elmapi publish/update events.
 * Invalidates the process-local CMS cache so the next request refetches Elmapi.
 *
 * Elmapi signs the JSON body with HMAC-SHA256 and sends
 * `X-Webhook-Signature`. Set the same value as REVALIDATE_SECRET
 * in the Elmapi webhook "Secret" field.
 *
 * Important: the site reads `state: published` only. Draft saves will
 * revalidate successfully but content will not change until you Publish.
 */
export const POST: APIRoute = async ({ request, url }) => {
  const secret = REVALIDATE_SECRET?.trim() ?? '';

  if (!secret) {
    return json({ ok: false, error: 'REVALIDATE_SECRET is not configured' }, 503);
  }

  const bodyText = await request.text();

  if (!verifyWebhookAuth(bodyText, request, url, secret)) {
    return json({ ok: false, error: 'Invalid secret' }, 401);
  }

  const generation = invalidateCmsCache();

  return json(
    {
      ok: true,
      revalidatedAt: new Date().toISOString(),
      generation,
      cacheGeneration: getCmsCacheGeneration(),
    },
    200,
  );
};

function verifyWebhookAuth(
  rawBody: string,
  request: Request,
  url: URL,
  secret: string,
): boolean {
  const headerSecret =
    request.headers.get('x-revalidate-secret') ||
    request.headers.get('x-elmapi-secret') ||
    request.headers.get('x-webhook-secret') ||
    '';
  if (headerSecret && secretsMatch(headerSecret, secret)) return true;

  const querySecret = url.searchParams.get('secret') || '';
  if (querySecret && secretsMatch(querySecret, secret)) return true;

  const signature = request.headers.get('x-webhook-signature') || '';
  if (!signature || !rawBody) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return secretsMatch(signature, expected);
}

function secretsMatch(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
