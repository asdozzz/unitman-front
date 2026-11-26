import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

/**
 * Guard манифеста AI-инструментов.
 *
 * Полноценный контрактный тест — зона WS-11; здесь только минимальная защита:
 * сгенерированный манифест не должен содержать внутренних операций и
 * свойств-учётных данных. `tokenHint` разрешён: это безопасная подсказка.
 */

interface Manifest {
    paths?: Record<string, Record<string, unknown>>;
}

const manifest = JSON.parse(
    readFileSync(
        resolve(process.cwd(), 'src/modules/ai-chat/generated/openapi.tools.json'),
        'utf8',
    ),
) as Manifest;

/** Ключи свойств, которые не должны появляться в манифесте. */
const FORBIDDEN_KEYS = new Set([
    'token',
    'refreshtoken',
    'accesstoken',
    'password',
    'secret',
    'apikey',
    'authorization',
]);

function normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[\s_-]+/g, '');
}

function collectForbiddenKeys(node: unknown, trail: string, out: string[]): void {
    if (Array.isArray(node)) {
        node.forEach((item, index) => collectForbiddenKeys(item, `${trail}/${index}`, out));
        return;
    }

    if (node === null || typeof node !== 'object') {
        return;
    }

    for (const [key, value] of Object.entries(node)) {
        if (FORBIDDEN_KEYS.has(normalizeKey(key))) {
            out.push(`${trail}/${key}`);
        }
        collectForbiddenKeys(value, `${trail}/${key}`, out);
    }
}

describe('openapi.tools.json manifest guard', () => {
    it('не содержит внутренних путей /api/internal/**', () => {
        const internalPaths = Object.keys(manifest.paths ?? {})
            .filter((pathKey) => pathKey === '/api/internal'
                || pathKey.startsWith('/api/internal/'));

        expect(internalPaths).toEqual([]);
    });

    it('не содержит операции выдачи учётных данных раннеру', () => {
        const serialized = JSON.stringify(manifest);

        expect(serialized).not.toContain('issue_runner_repo_credentials');
        expect(serialized).not.toContain('/api/internal/');
    });

    it('не содержит свойств-учётных данных (tokenHint разрешён)', () => {
        const findings: string[] = [];

        collectForbiddenKeys(manifest, '', findings);

        expect(findings).toEqual([]);
    });

    it('содержит хотя бы одну AI-операцию', () => {
        const operations = Object.values(manifest.paths ?? {})
            .flatMap((pathItem) => Object.values(pathItem));

        expect(operations.length).toBeGreaterThan(0);
    });
});
