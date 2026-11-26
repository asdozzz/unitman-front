import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('@/bootstrap/apiClient', () => ({
  default: {
    post: mocks.post,
    get: vi.fn(),
  },
}));

import AccountService from '@/modules/account/services/AccountService';

describe('AccountService: cookie-based refresh', () => {
  beforeEach(() => {
    mocks.post.mockReset().mockResolvedValue({ status: 'success', data: { token: 'synthetic' } });
  });

  it('does not send a refreshToken in the request body', () => {
    AccountService.obnovitToken();

    // Один аргумент: только путь. Тело не отправляется — токен в cookie.
    expect(mocks.post).toHaveBeenCalledWith('/account/refreshToken');
    expect(mocks.post.mock.calls[0]).toHaveLength(1);
  });

  it('calls the server logout endpoint', () => {
    AccountService.logout();

    expect(mocks.post).toHaveBeenCalledWith('/account/logout');
  });
});
