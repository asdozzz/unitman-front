import { describe, expect, it } from 'vitest';
import {
  normalizovatHodWorkspace,
  normalizovatRezultatHoda,
  type WorkspaceAttachment,
  type WorkspaceTurn,
} from '@/modules/opencode/model/WorkspaceSession';

const VLOZHENIE: WorkspaceAttachment = {
  FileId: 'file-1',
  Name: 'feature-plan.md',
  Size: 18432,
  ContentType: 'text/markdown',
  Previewable: true,
};

function hodSRezultatom(result: WorkspaceTurn['result']): WorkspaceTurn {
  return {
    id: 'turn-1',
    sessionId: 'session-1',
    seq: 1,
    status: 'ANSWERED',
    requestText: 'Сделай план',
    answers: [],
    result,
    errorKey: null,
    createdAt: 1,
    finishedAt: 2,
    progressChannel: 'progress-1',
  };
}

describe('WorkspaceSession: нормализация вложений', () => {
  it('legacy-результат без Attachments получает пустой список', () => {
    const result = normalizovatRezultatHoda({ Kind: 'ANSWER', Answer: 'Готово' });

    expect(result).not.toBeNull();
    expect(result?.Attachments).toEqual([]);
  });

  it('существующие вложения сохраняются без изменений', () => {
    const result = normalizovatRezultatHoda({ Kind: 'ANSWER', Attachments: [VLOZHENIE] });

    expect(result?.Attachments).toEqual([VLOZHENIE]);
  });

  it('null-результат остаётся null', () => {
    expect(normalizovatRezultatHoda(null)).toBeNull();
  });

  it('ход нормализуется вместе с результатом', () => {
    const hod = normalizovatHodWorkspace(hodSRezultatom({ Kind: 'ANSWER' }));

    expect(hod.result?.Attachments).toEqual([]);
  });
});
