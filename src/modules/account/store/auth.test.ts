import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({
  obnovitToken: vi.fn(),
  logout: vi.fn(),
  assign: vi.fn(),
}));

vi.mock('@/modules/account/services/AccountService', () => ({
  default: {
    login: vi.fn(),
    obnovitToken: mocks.obnovitToken,
    logout: mocks.logout,
  },
}));

vi.mock('@/bootstrap/translator', () => ({
  default: {
    global: {
      locale: { value: 'ru' },
      t: (key: string) => key,
      te: () => false,
    },
  },
}));

vi.mock('quasar', () => ({
  Notify: { create: vi.fn() },
}));

vi.mock('@/modules/account/store/auth/LoginView', () => ({
  default: class {
    form = { login: '', pass: '' };
  },
}));

vi.mock('@/bootstrap/apiClient', () => ({
  default: {},
}));

import { useAuthStore } from '@/modules/account/store/auth';

const STORAGE_KEY = 'tokenData';

function syntheticTokenData(overrides: Record<string, unknown> = {}) {
  return {
    token: 'synthetic-access-token-not-a-real-jwt',
    user: {
      id: 'synthetic-account-id',
      email: 'synthetic@example.test',
      roles: ['ROLE_USER'],
      locale: 'ru',
    },
    ...overrides,
  };
}

describe('auth store: refresh transport', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    mocks.obnovitToken.mockReset();
    mocks.logout.mockReset().mockResolvedValue({ status: 'success', data: null });
    mocks.assign.mockReset();
    vi.stubGlobal('location', { assign: mocks.assign });
  });

  it('never persists refreshToken, even if a caller passes one', () => {
    const store = useAuthStore();

    store.prinyatTokenData(
      syntheticTokenData({ refreshToken: 'synthetic-refresh-should-be-dropped' }) as never,
    );

    const raw = localStorage.getItem(STORAGE_KEY) ?? '';

    expect(raw).not.toContain('refreshToken');
    expect(raw).not.toContain('synthetic-refresh-should-be-dropped');
    expect(JSON.parse(raw).token).toBe('synthetic-access-token-not-a-real-jwt');
  });

  it('rotates only the access token in state/storage on refresh', async () => {
    const store = useAuthStore();
    store.$patch({ tokenData: syntheticTokenData() as never });

    mocks.obnovitToken.mockResolvedValue({
      status: 'success',
      data: { token: 'synthetic-new-access-token' },
    });

    await expect(store.obnovitToken()).resolves.toBe(true);

    const raw = localStorage.getItem(STORAGE_KEY) ?? '';

    expect(raw).not.toContain('refreshToken');
    expect(JSON.parse(raw).token).toBe('synthetic-new-access-token');
  });

  it('logs out and redirects to login when refresh fails', async () => {
    const store = useAuthStore();
    store.$patch({ tokenData: syntheticTokenData() as never });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(syntheticTokenData()));

    mocks.obnovitToken.mockResolvedValue({
      status: 'fail',
      data: { message: 'account.refresh_token.invalid' },
    });

    await expect(store.obnovitToken()).resolves.toBe(false);

    expect(store.tokenData).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(mocks.assign).toHaveBeenCalledWith('/login');
    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });

  it('clears local state and calls server logout', () => {
    const store = useAuthStore();
    store.$patch({ tokenData: syntheticTokenData() as never });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(syntheticTokenData({ refreshToken: 'synthetic-refresh' })),
    );

    store.logout();

    expect(store.tokenData).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });
});
