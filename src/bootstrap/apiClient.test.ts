import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(() => ({
    request: vi.fn(),
  })),
}));

vi.mock('axios', () => ({
  default: { create: mocks.create },
  create: mocks.create,
}));

vi.mock('@/modules/account/store/auth', () => ({
  useAuthStore: () => null,
}));

vi.mock('@/utils/runtimeEnv', () => ({
  apiHost: () => 'http://api.test/api',
}));

describe('apiClient: credentialed cookie transport', () => {
  it('configures withCredentials (fetch credentials: include) and the CSRF header', async () => {
    await import('@/bootstrap/apiClient');

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        withCredentials: true,
        headers: expect.objectContaining({
          'X-Requested-With': 'XMLHttpRequest',
        }),
      }),
    );
  });
});
