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

  it('отправляет промпт в новый агрегат workspace', async () => {
    await WorkspaceService.prompt({
      workspaceId: 'ws-1',
      text: 'Сделай план',
      credentialId: 'cred-1',
      model: 'gpt-4o',
    });

    expect(mocks.post).toHaveBeenCalledWith('/opencode/workspace-session/prompt', {
      workspaceId: 'ws-1',
      text: 'Сделай план',
      credentialId: 'cred-1',
      model: 'gpt-4o',
    });
  });

  it('отправляет ответ на вопросы в новый агрегат workspace', async () => {
    await WorkspaceService.otvetit({
      turnId: 'turn-1',
      credentialId: 'cred-1',
      answers: [{ QuestionId: 'q-1', OptionId: 'o-1', Text: null }],
    });

    expect(mocks.post).toHaveBeenCalledWith(
      '/opencode/workspace-session/otvetit',
      expect.objectContaining({
        turnId: 'turn-1',
        credentialId: 'cred-1',
      }),
    );
  });

  it('не отправляет пустой credentialId и model', async () => {
    await WorkspaceService.prompt({ workspaceId: 'ws-1', text: 'Текст', credentialId: null });

    expect(mocks.post).toHaveBeenCalledWith('/opencode/workspace-session/prompt', {
      workspaceId: 'ws-1',
      text: 'Текст',
      credentialId: undefined,
      model: undefined,
    });
  });

  it('запрашивает участников workspace', async () => {
    await WorkspaceService.spisokUchastnikov({ workspaceId: 'ws-1' });

    expect(mocks.post).toHaveBeenCalledWith('/opencode/workspace/uchastniki/spisok', {
      workspaceId: 'ws-1',
    });
  });

  it('приглашает участника с ролью и реквизитами', async () => {
    await WorkspaceService.dobavitUchastnika({
      workspaceId: 'ws-1',
      accountId: 'acc-2',
      role: 'viewer',
      credentialId: 'cred-1',
      model: 'gpt-4o',
    });

    expect(mocks.post).toHaveBeenCalledWith('/opencode/workspace/uchastniki/dobavit', {
      workspaceId: 'ws-1',
      accountId: 'acc-2',
      role: 'viewer',
      credentialId: 'cred-1',
      model: 'gpt-4o',
    });
  });

  it('меняет роль участника', async () => {
    await WorkspaceService.izmenitUchastnika({
      workspaceId: 'ws-1',
      accountId: 'acc-2',
      role: 'writer',
    });

    expect(mocks.post).toHaveBeenCalledWith('/opencode/workspace/uchastniki/izmenit', {
      workspaceId: 'ws-1',
      accountId: 'acc-2',
      role: 'writer',
      credentialId: undefined,
      model: undefined,
    });
  });

  it('удаляет участника по accountId', async () => {
    await WorkspaceService.udalitUchastnika({ workspaceId: 'ws-1', accountId: 'acc-2' });

    expect(mocks.post).toHaveBeenCalledWith('/opencode/workspace/uchastniki/udalit', {
      workspaceId: 'ws-1',
      accountId: 'acc-2',
    });
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
