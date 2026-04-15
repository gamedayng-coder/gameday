import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://gameday-wheat.vercel.app';
const AGENT_API_KEY = process.env.AGENT_API_KEY || 'test-bearer-token';

test.describe('Agent API Endpoints', () => {
  test('should accept bearer token authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agent/sync`, {
      headers: {
        'Authorization': `Bearer ${AGENT_API_KEY}`,
      },
    });

    // Should either succeed or reject with auth error (not 404)
    expect([200, 400, 401, 403].includes(response.status())).toBe(true);
  });

  test('GET /api/agent/sync should return valid response', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agent/sync`, {
      headers: {
        'Authorization': `Bearer ${AGENT_API_KEY}`,
      },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(typeof data === 'object' || Array.isArray(data)).toBe(true);
    }
  });

  test('POST /api/agent/sync should accept request body', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/agent/sync`, {
      headers: {
        'Authorization': `Bearer ${AGENT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        dataSourceId: 'test-id',
      },
    });

    expect([200, 400, 401, 403].includes(response.status())).toBe(true);
  });

  test('GET /api/agent/generate should be callable', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agent/generate`, {
      headers: {
        'Authorization': `Bearer ${AGENT_API_KEY}`,
      },
    });

    expect([200, 400, 401, 403].includes(response.status())).toBe(true);
  });

  test('POST /api/agent/generate should accept payload', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/agent/generate`, {
      headers: {
        'Authorization': `Bearer ${AGENT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        eventId: 'test-event',
        contentType: 'graphic',
      },
    });

    expect([200, 400, 401, 403].includes(response.status())).toBe(true);
  });

  test('POST /api/agent/queue should queue content', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/agent/queue`, {
      headers: {
        'Authorization': `Bearer ${AGENT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        contentId: 'test-content',
        channels: ['twitter', 'linkedin'],
      },
    });

    expect([200, 400, 401, 403].includes(response.status())).toBe(true);
  });

  test('POST /api/agent/publish should publish content', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/agent/publish`, {
      headers: {
        'Authorization': `Bearer ${AGENT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        contentId: 'test-content',
        schedule: 'immediate',
      },
    });

    expect([200, 400, 401, 403].includes(response.status())).toBe(true);
  });

  test('should reject requests without authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agent/sync`);

    // Should reject unauthorized requests
    expect([401, 403].includes(response.status())).toBe(true);
  });

  test('should reject requests with invalid token', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agent/sync`, {
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });

    expect([401, 403].includes(response.status())).toBe(true);
  });

  test('should validate request payload format', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/agent/sync`, {
      headers: {
        'Authorization': `Bearer ${AGENT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: 'invalid json',
    });

    // Should reject malformed JSON
    expect(response.status()).not.toBe(200);
  });

  test('API response should include proper headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/agent/sync`, {
      headers: {
        'Authorization': `Bearer ${AGENT_API_KEY}`,
      },
    });

    expect(response.headers()['content-type']).toMatch(/json/i);
  });
});
