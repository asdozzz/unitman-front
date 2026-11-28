import { describe, expect, it } from 'vitest';
import {
  avtorHoda,
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

describe('WorkspaceSession: авторство хода', () => {
  it('имя автора берётся из authorDisplayName', () => {
    const avtor = avtorHoda(
      { authorAccountId: 'acc-2', authorDisplayName: 'Иван Петров' },
      'acc-1',
    );

    expect(avtor).toEqual({
      imya: 'Иван Петров',
      accountId: 'acc-2',
      etoTekushiy: false,
      bezAvtora: false,
    });
  });

  it('автор-текущий пользователь помечается флагом', () => {
    const avtor = avtorHoda(
      { authorAccountId: 'acc-1', authorDisplayName: 'Я' },
      'acc-1',
    );

    expect(avtor.etoTekushiy).toBe(true);
    expect(avtor.bezAvtora).toBe(false);
  });

  it('легаси-ход без автора получает нейтральный fallback', () => {
    const avtor = avtorHoda({ authorAccountId: null, authorDisplayName: null }, 'acc-1');

    expect(avtor).toEqual({
      imya: null,
      accountId: null,
      etoTekushiy: false,
      bezAvtora: true,
    });
  });

  it('аккаунт без имени остаётся пригодным для подписи по id', () => {
    const avtor = avtorHoda({ authorAccountId: 'acc-9' }, 'acc-1');

    expect(avtor.imya).toBeNull();
    expect(avtor.accountId).toBe('acc-9');
    expect(avtor.bezAvtora).toBe(false);
  });
});
