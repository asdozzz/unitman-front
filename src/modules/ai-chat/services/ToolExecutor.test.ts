import {beforeEach, describe, expect, it, vi} from 'vitest';

/**
 * Тесты защитной санитизации tool-сообщений.
 *
 * Все секреты синтетические (`TESTTOKENEXAMPLEVALUE`): реальные значения в
 * тесты и фикстуры не попадают.
 */

const SECRET = 'TESTTOKENEXAMPLEVALUE';

const {mockMeta, requestRaw, resolveTool} = vi.hoisted(() => ({
    mockMeta: {
        operationId: 'demo_operation',
        toolName: 'demo_tool',
        method: 'post' as const,
        path: '/api/demo',
        summary: 'Demo',
        description: 'Demo operation',
        tags: [],
        confirm: false,
        roles: [],
        deps: [],
        args: [],
        inputSchema: {},
    },
    requestRaw: vi.fn(),
    resolveTool: vi.fn(),
}));

vi.mock('@/bootstrap/apiClient', () => ({
    default: {requestRaw},
}));

vi.mock('@/modules/ai-chat/services/OpenApiToolRegistry', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/modules/ai-chat/services/OpenApiToolRegistry')>();

    return {
        ...actual,
        openApiToolRegistry: {
            initialize: vi.fn().mockResolvedValue(undefined),
            resolveTool,
            searchAndActivate: vi.fn(),
        },
    };
});

import toolExecutor, {
    isSensitiveKey,
    REDACTED_MARKER,
    sanitizeForToolMessage,
    sanitizeToolText,
} from '@/modules/ai-chat/services/ToolExecutor';

const nestedPayload = () => ({
    id: 'repo-1',
    name: 'demo-repo',
    tokenHint: 'abcd',
    token: SECRET,
    nested: {
        refresh_token: `${SECRET}-refresh`,
        'Refresh-Token': `${SECRET}-refresh-dash`,
        accessToken: `${SECRET}-access`,
        password: `${SECRET}-password`,
        secret: `${SECRET}-secret`,
        apiKey: `${SECRET}-apikey`,
        api_key: `${SECRET}-apikey-underscore`,
        authorization: `Bearer ${SECRET}`,
        cookie: `session=${SECRET}`,
        'set-cookie': `session=${SECRET}`,
        privateKey: `${SECRET}-private`,
        credentials: {value: SECRET},
        tokenCipher: `${SECRET}-cipher`,
    },
    list: [
        {token: SECRET, tokenHint: 'wxyz'},
        {access_token: `${SECRET}-nested-array`, label: 'untouched'},
    ],
    urls: [
        `https://user:${SECRET}@example.com/path`,
        `oauth2:${SECRET}@oauth.example.com/token`,
    ],
    storageUrl: `https://user:${SECRET}@storage.example.com/bucket`,
    publicField: 'unchanged-value',
});

describe('ToolExecutor sanitization helpers', () => {
    it('распознаёт чувствительные ключи без учёта регистра и разделителей', () => {
        expect(isSensitiveKey('token')).toBe(true);
        expect(isSensitiveKey('refresh_token')).toBe(true);
        expect(isSensitiveKey('Refresh-Token')).toBe(true);
        expect(isSensitiveKey('API_KEY')).toBe(true);
        expect(isSensitiveKey('Set-Cookie')).toBe(true);
        expect(isSensitiveKey('tokenCipher')).toBe(true);
        expect(isSensitiveKey('tokenHint')).toBe(false);
        expect(isSensitiveKey('name')).toBe(false);
    });

    it('вырезает userinfo из строк', () => {
        expect(sanitizeToolText(`https://user:${SECRET}@host/path`))
            .toBe(`https://${REDACTED_MARKER}@host/path`);
        expect(sanitizeToolText(`oauth2:${SECRET}@host`))
            .toBe(`oauth2:${REDACTED_MARKER}@host`);
    });

    it('рекурсивно редактирует вложенные структуры и сохраняет tokenHint', () => {
        const sanitized = sanitizeForToolMessage(nestedPayload());
        const serialized = JSON.stringify(sanitized);

        expect(serialized).not.toContain(SECRET);
        expect(serialized).not.toContain('user:');
        expect(serialized).not.toContain('Bearer');
        expect(serialized).toContain('"tokenHint":"abcd"');
        expect(serialized).toContain('"publicField":"unchanged-value"');
        expect(serialized).toContain('"label":"untouched"');
    });
});

describe('ToolExecutor tool messages', () => {
    beforeEach(() => {
        requestRaw.mockReset();
        resolveTool.mockReset().mockReturnValue(mockMeta);
    });

    it('не пропускает ни одного секрета в tool-сообщение и сохраняет tokenHint', async () => {
        requestRaw.mockResolvedValue({
            ok: true,
            status: 200,
            data: nestedPayload(),
            error: null,
        });

        const result = await toolExecutor.execute('demo_tool', {}, {confirmed: true});

        expect(result.ok).toBe(true);
        expect(result.content).not.toContain(SECRET);
        expect(result.content).not.toContain('user:');
        expect(result.content).not.toContain('Bearer');
        expect(result.content).toContain('"tokenHint":"abcd"');
        expect(result.content).toContain('unchanged-value');
        expect(result.content).toContain(REDACTED_MARKER);
    });

    it('санитизирует текст ошибки и тело ошибочного ответа', async () => {
        requestRaw.mockResolvedValue({
            ok: false,
            status: 401,
            data: {token: SECRET, message: `denied for https://user:${SECRET}@host`},
            error: `Unauthorized: oauth2:${SECRET}@host`,
        });

        const result = await toolExecutor.execute('demo_tool', {}, {confirmed: true});

        expect(result.ok).toBe(false);
        expect(result.content).not.toContain(SECRET);
        expect(result.error).not.toContain(SECRET);
        expect(result.error).not.toContain('oauth2:' + SECRET);
        expect(result.content).toContain(REDACTED_MARKER);
    });

    it('отбрасывает несериализуемое тело и возвращает общую ошибку (fail closed)', async () => {
        requestRaw.mockResolvedValue({
            ok: true,
            status: 200,
            data: {broken: 10n},
            error: null,
        });

        const result = await toolExecutor.execute('demo_tool', {}, {confirmed: true});

        expect(result.ok).toBe(false);
        expect(result.data).toBeNull();
        expect(result.error).toContain('could not be safely sanitized');
        expect(result.content).not.toContain('broken');
    });
});
