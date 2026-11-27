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

import WorkspaceService from '@/modules/opencode/services/WorkspaceService';

describe('WorkspaceService: файлы хода', () => {
  beforeEach(() => {
    mocks.post.mockReset().mockResolvedValue({ status: 'success', data: {} });
  });

  it('запрашивает ссылку на файл по turnId и fileId', async () => {
    await WorkspaceService.poluchitSsylkuFajla({ turnId: 'turn-1', fileId: 'file-1' });

    expect(mocks.post).toHaveBeenCalledWith('/opencode/fajl/ssylka', {
      turnId: 'turn-1',
      fileId: 'file-1',
    });
  });

  it('запрашивает текст файла по turnId и fileId', async () => {
    await WorkspaceService.poluchitTekstFajla({ turnId: 'turn-1', fileId: 'file-2' });

    expect(mocks.post).toHaveBeenCalledWith('/opencode/fajl/tekst', {
      turnId: 'turn-1',
      fileId: 'file-2',
    });
  });
});
