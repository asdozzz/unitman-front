#!/usr/bin/env node
/**
 * Генерация TypeScript-типов (d.ts) по OpenAPI-спецификации внешнего сервиса Unitman.
 *
 * Источник спецификации определяется в порядке приоритета:
 *   1. --file <path>            локальный файл спецификации (json/yaml)
 *   2. --url <url>              явный URL
 *   3. --offline                использовать снимок openapi/unitman.json без сети
 *   4. env OPENAPI_URL          URL из переменной окружения
 *   5. env VITE_API_HOST        <VITE_API_HOST>/doc.json
 *   6. снимок openapi/unitman.json
 *
 * Примеры:
 *   yarn gen:api                              # сгенерировать по URL из окружения
 *   yarn gen:api --file openapi/unitman.json  # по локальному снимку
 *   yarn gen:api --offline                    # без обращения к сети
 *   yarn gen:api --check                      # только проверка актуальности (CI)
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUT = path.join(ROOT, "src/api/generated/unitman.d.ts");
const SNAPSHOT_PATH = path.join(ROOT, "openapi/unitman.json");

/** Минимальный парсер .env без зависимостей. */
async function readEnvFile(file) {
    const result = {};
    if (!existsSync(file)) return result;
    const content = await readFile(file, "utf8");
    for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        result[key] = value;
    }
    return result;
}

async function loadEnv() {
    const fromDist = await readEnvFile(path.join(ROOT, ".env.dist"));
    const fromLocal = await readEnvFile(path.join(ROOT, ".env.local"));
    const fromEnv = await readEnvFile(path.join(ROOT, ".env"));
    return { ...fromDist, ...fromEnv, ...fromLocal, ...process.env };
}

function parseArgs(argv) {
    const args = { check: false, offline: false, snapshot: true };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const next = () => argv[++i];
        switch (arg) {
            case "--check":
                args.check = true;
                break;
            case "--offline":
                args.offline = true;
                args.snapshot = false;
                break;
            case "--no-snapshot":
                args.snapshot = false;
                break;
            case "--file":
                args.file = next();
                break;
            case "--url":
                args.url = next();
                break;
            case "--out":
                args.out = next();
                break;
            case "--strip-prefix":
                args.stripPrefix = next();
                break;
            case "--help":
            case "-h":
                args.help = true;
                break;
            default:
                if (arg.startsWith("-")) {
                    throw new Error(`Неизвестный аргумент: ${arg}`);
                }
                args.file = arg;
        }
    }
    return args;
}

async function fetchSpec(url) {
    const response = await fetch(url, {
        headers: { Accept: "application/json, application/yaml, text/yaml, */*" },
        signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
        throw new Error(`Не удалось получить спецификацию: ${url} -> HTTP ${response.status}`);
    }
    const body = await response.text();
    if (body.trim().startsWith("<")) {
        throw new Error(`По адресу ${url} вернулся HTML, а не OpenAPI-спецификация`);
    }
    return body;
}

async function loadSpecSource({ file, url, offline }, env) {
    if (file) {
        const absolute = path.isAbsolute(file) ? file : path.join(ROOT, file);
        if (!existsSync(absolute)) {
            throw new Error(`Файл спецификации не найден: ${absolute}`);
        }
        return { text: await readFile(absolute, "utf8"), origin: `file:${path.relative(ROOT, absolute)}` };
    }

    const fromUrl = url || env.OPENAPI_URL || (env.VITE_API_HOST ? `${env.VITE_API_HOST.replace(/\/+$/, "")}/doc.json` : null);

    if (!offline && fromUrl) {
        try {
            const text = await fetchSpec(fromUrl);
            return { text, origin: fromUrl };
        } catch (error) {
            if (!existsSync(SNAPSHOT_PATH)) throw error;
            console.warn(`[api-types] Не удалось скачать спецификацию (${error.message}). Использую снимок openapi/unitman.json`);
        }
    }

    if (existsSync(SNAPSHOT_PATH)) {
        return { text: await readFile(SNAPSHOT_PATH, "utf8"), origin: "file:openapi/unitman.json" };
    }

    throw new Error(
        "Спецификация не найдена. Укажите --file <path> или --url <url>, " +
        "либо задайте OPENAPI_URL / VITE_API_HOST в .env.local",
    );
}

function parseSpec(text, origin) {
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            `Не удалось разобрать спецификацию из ${origin} как JSON. ` +
            "Если это YAML — конвертируйте в JSON или передайте файл в openapi-typescript напрямую.",
        );
    }
}

/** Определяет общий префикс путей, который уже содержится в baseURL клиента. */
function detectBasePrefix(paths) {
    const keys = Object.keys(paths);
    if (keys.length === 0) return null;

    const segments = keys.map((key) => key.split("/").filter(Boolean));
    const first = segments[0];
    if (!first.length) return null;

    let length = 0;
    for (let i = 0; i < first.length; i++) {
        const segment = first[i];
        if (segments.every((parts) => parts[i] === segment)) {
            length = i + 1;
        } else {
            break;
        }
    }

    if (length === 0) return null;
    return "/" + first.slice(0, length).join("/");
}

function stripPrefix(spec, prefix) {
    if (!prefix) return spec;

    const stripped = {};
    for (const [key, value] of Object.entries(spec.paths ?? {})) {
        const nextKey = key.slice(prefix.length) || "/";
        stripped[nextKey] = value;
    }

    return { ...spec, paths: stripped };
}

/**
 * Шапка файла. Внутри не должно быть ничего изменчивого (URL, дата, имя файла),
 * иначе `--check` будет ругаться на каждый запуск при том же контракте.
 * Источник спецификации печатается в консоль.
 */
function buildBanner({ spec, prefix }) {
    const lines = [
        "// СГЕНЕРИРОВАННЫЙ ФАЙЛ. НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.",
        "//",
        `// Спецификация: ${spec.info?.title ?? "unknown"} (OpenAPI ${spec.openapi})`,
    ];
    if (prefix) {
        lines.push(`// Префикс путей "${prefix}" снят: он уже содержится в baseURL apiClient.`);
    }
    lines.push("//",
        "// Обновление: yarn gen:api",
        "// Проверка актуальности: yarn gen:api:check",
        "",
        "",
    );
    return lines.join("\n");
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log(
            [
                "Использование: node scripts/gen-api-types.mjs [опции]",
                "",
                "  --file <path>          локальный файл спецификации",
                "  --url <url>            URL спецификации",
                "  --out <path>           путь результата (по умолчанию src/api/generated/unitman.d.ts)",
                "  --strip-prefix <path>  снять указанный префикс путей (по умолчанию определяется автоматически)",
                "  --offline              не обращаться к сети, взять openapi/unitman.json",
                "  --no-snapshot          не сохранять снимок openapi/unitman.json",
                "  --check                проверить, что файл актуален (код возврата 1 при расхождении)",
            ].join("\n"),
        );
        return;
    }

    const env = await loadEnv();
    const source = await loadSpecSource(args, env);
    console.log(`[api-types] Источник спецификации: ${source.origin}`);
    const rawSpec = parseSpec(source.text, source.origin);

    if (args.snapshot && !args.file && /^https?:/.test(source.origin)) {
        await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
        await writeFile(SNAPSHOT_PATH, source.text);
        console.log(`[api-types] Снимок спецификации сохранён: ${path.relative(ROOT, SNAPSHOT_PATH)}`);
    }

    const prefix = args.stripPrefix ?? detectBasePrefix(rawSpec.paths ?? {});
    const spec = stripPrefix(rawSpec, prefix);
    if (prefix) {
        console.log(`[api-types] Префикс путей снят: ${prefix}`);
    }

    const ast = await openapiTS(spec, {
        alphabetize: true,
        // Поля со значением по умолчанию сервер заполняет сам, поэтому считаем их опциональными.
        defaultNonNullable: false,
        emptyObjectsUnknown: false,
        // Union-литералы вместо TS-enum: соответствуют текущему стилю моделей.
        enum: false,
        immutable: false,
        exportType: true,
    });

    const content = buildBanner({ spec: rawSpec, prefix }) + COMMENT_HEADER + astToString(ast, { fileName: "unitman.ts" });
    const outPath = args.out ? (path.isAbsolute(args.out) ? args.out : path.join(ROOT, args.out)) : DEFAULT_OUT;

    if (args.check) {
        if (!existsSync(outPath)) {
            console.error(`[api-types] Файл отсутствует: ${path.relative(ROOT, outPath)}. Запустите yarn gen:api`);
            process.exitCode = 1;
            return;
        }
        // Сравниваем с нормализованными переводами строк: файл может быть
        // выгружен на Windows с CRLF, хотя содержимое при этом идентично.
        const normalize = (text) => text.replace(/\r\n/g, "\n");
        const current = normalize(await readFile(outPath, "utf8"));
        if (current !== normalize(content)) {
            console.error(`[api-types] Типы устарели: ${path.relative(ROOT, outPath)}. Запустите yarn gen:api и закоммитьте изменения`);
            process.exitCode = 1;
            return;
        }
        console.log(`[api-types] Типы актуальны: ${path.relative(ROOT, outPath)}`);
        return;
    }

    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, content);
    console.log(`[api-types] Сгенерировано: ${path.relative(ROOT, outPath)}`);
}

main().catch((error) => {
    console.error(`[api-types] Ошибка: ${error.message}`);
    process.exitCode = 1;
});
