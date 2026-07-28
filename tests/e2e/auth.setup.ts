import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';

const AUTH_STATE_PATH = path.join(
  process.cwd(),
  'playwright/.auth/user.json',
);

setup('creates an authenticated, onboarded user', async ({ request }) => {
  const registerResponse = await request.post('/api/auth/register', {
    data: {
      name: 'E2E Smoke User',
      email: `smoke-${randomUUID()}@example.com`,
      password: 'smoketest1234',
    },
  });

  expect(registerResponse.ok()).toBe(true);

  const registeredState = await request.storageState();
  const csrfCookie = registeredState.cookies.find(
    (cookie) => cookie.name === 'csrf_token',
  );

  expect(csrfCookie).toBeDefined();

  const onboardingResponse = await request.post('/api/categories/seed', {
    data: { preset: 'minimal' },
    headers: {
      'X-CSRF-Token': csrfCookie!.value,
    },
  });

  expect(onboardingResponse.ok()).toBe(true);

  await mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });
  await request.storageState({ path: AUTH_STATE_PATH });
});
