/**
 * Agent API proxy — authenticated endpoints for Paperclip agents.
 *
 * Auth: supports both Authorization: Bearer <key> and X-Agent-Key <key> headers.
 * Proxies authenticated requests to the scheduler-service (SCHEDULER_SERVICE_URL).
 *
 * Required env vars:
 *   AGENT_API_KEY        — shared secret agents authenticate with
 *   SCHEDULER_SERVICE_URL — base URL of the scheduler-service (e.g. Railway deployment)
 *
 * Endpoints proxied:
 *   POST /api/agent/sync       — trigger sports data sync
 *   POST /api/agent/generate   — generate posters from today's fixtures
 *   GET  /api/agent/queue      — inspect poster queue
 *   POST /api/agent/publish    — publish approved posters to social channels
 */

import { NextRequest, NextResponse } from 'next/server';

const AGENT_API_KEY = process.env.AGENT_API_KEY;
const SCHEDULER_SERVICE_URL = (process.env.SCHEDULER_SERVICE_URL ?? '').replace(/\/$/, '');

function authenticate(req: NextRequest): boolean {
  if (!AGENT_API_KEY) return false;

  // Support Authorization: Bearer <key>
  const auth = req.headers.get('authorization');
  if (auth) {
    const parts = auth.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1] === AGENT_API_KEY) return true;
  }

  // Support X-Agent-Key: <key>
  if (req.headers.get('x-agent-key') === AGENT_API_KEY) return true;

  return false;
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ route: string[] }> },
): Promise<NextResponse> {
  if (!AGENT_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Agent API not configured (missing AGENT_API_KEY env var)' },
      { status: 503 },
    );
  }

  if (!authenticate(req)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid or missing credentials' },
      { status: 401 },
    );
  }

  if (!SCHEDULER_SERVICE_URL) {
    return NextResponse.json(
      { ok: false, error: 'Scheduler service not configured (missing SCHEDULER_SERVICE_URL env var)' },
      { status: 503 },
    );
  }

  const { route } = await params;
  const path = route.join('/');
  const search = req.nextUrl.search;
  const upstreamUrl = `${SCHEDULER_SERVICE_URL}/api/agent/${path}${search}`;

  try {
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody ? await req.text() : undefined;

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward as X-Agent-Key which is what the scheduler-service expects
        'X-Agent-Key': AGENT_API_KEY,
      },
      ...(body !== undefined ? { body } : {}),
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: `Proxy error: ${(error as Error).message}` },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
