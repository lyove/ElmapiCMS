import type { APIRoute } from 'astro';
import { elmapi } from '../../lib/elmapi';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const name = trim(body.name);
  const email = trim(body.email);
  const phone = trim(body.phone);
  const partySize = trim(body.partySize ?? body['party-size']);
  const preferredDate = trim(body.preferredDate ?? body['preferred-date']);
  const preferredTime = trim(body.preferredTime ?? body['preferred-time']);
  const occasion = trim(body.occasion);
  const notes = trim(body.notes);

  if (!name || !email) {
    return new Response(JSON.stringify({ ok: false, error: 'Name and email are required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'Enter a valid email address.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!partySize || !preferredDate || !preferredTime) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Party size, date, and time are required.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    await elmapi.content.create('reservation-requests', {
      data: {
        name,
        email,
        phone,
        'party-size': partySize,
        'preferred-date': preferredDate,
        'preferred-time': preferredTime,
        occasion,
        notes,
        source: 'website',
      },
      state: 'draft',
    });
  } catch (error) {
    console.error('Failed to create reservation request', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Could not send your request. Try again shortly.' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
