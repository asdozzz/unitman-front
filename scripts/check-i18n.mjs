#!/usr/bin/env node
/**
 * Guard-rail проверка i18n.
 *
 * 1) Сверяет структуру ключей src/translator/ru.json и src/translator/en.json.
 * 2) Ищет захардкоженную кириллицу в <template> SFC-файлов src/**\/*.vue:
 *    - текстовые узлы (кроме {{ ... }} и комментариев);
 *    - литеральные значения label/title/placeholder/aria-label/hint;
 *    - литеральный текст внутри <q-tooltip>.
 *
 * Зависимостей нет — только node:fs, node:path, node:url.
 * Код возврата: 0 — всё чисто, 1 — расхождение структуры или находки.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "src");
const RU_PATH = path.join(SRC_DIR, "translator", "ru.json");
const EN_PATH = path.join(SRC_DIR, "translator", "en.json");

const SKIP_DIRS = new Set(["node_modules", "dist", ".vite", "coverage"]);
const CYRILLIC = /[\u0400-\u04FF]/;
const LITERAL_ATTRS = new Set(["label", "title", "placeholder", "aria-label", "hint"]);

/** Путь относительно корня репозитория с прямыми слэшами. */
function relativePath(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function compareStrings(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function countNewlines(text) {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") count += 1;
  }
  return count;
}

/* ------------------------------------------------------------------ */
/* Словари                                                             */
/* ------------------------------------------------------------------ */

/**
 * Рекурсивно собирает пути. Значение в Map — тип узла:
 * "object" | "array" | "leaf". Массивы обходятся как ветки.
 */
function collectPaths(value, prefix, out) {
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === "object";

  if (isArray || isObject) {
    if (prefix !== "") {
      out.set(prefix, isArray ? "array" : "object");
    }
    const keys = isArray
      ? value.map((_, index) => String(index))
      : Object.keys(value);
    for (const key of keys) {
      collectPaths(value[key], prefix === "" ? key : `${prefix}.${key}`, out);
    }
    return;
  }

  out.set(prefix === "" ? "<root>" : prefix, "leaf");
}

function readDictionary(file) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch (error) {
    throw new Error(`cannot read ${relativePath(file)}: ${error.message}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid JSON in ${relativePath(file)}: ${error.message}`);
  }

  const paths = new Map();
  collectPaths(data, "", paths);
  return paths;
}

function compareDictionaries(ru, en) {
  const onlyRu = [];
  const onlyEn = [];
  const typeMismatch = [];

  for (const [key, kind] of ru) {
    if (!en.has(key)) {
      onlyRu.push(key);
    } else if (en.get(key) !== kind) {
      typeMismatch.push(key);
    }
  }
  for (const key of en.keys()) {
    if (!ru.has(key)) onlyEn.push(key);
  }

  onlyRu.sort(compareStrings);
  onlyEn.sort(compareStrings);
  typeMismatch.sort(compareStrings);

  return {
    onlyRu,
    onlyEn,
    typeMismatch,
    ok: onlyRu.length === 0 && onlyEn.length === 0 && typeMismatch.length === 0,
  };
}

/* ------------------------------------------------------------------ */
/* Обход .vue                                                          */
/* ------------------------------------------------------------------ */

function walkVueFiles(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  entries.sort((a, b) => compareStrings(a.name, b.name));

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkVueFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".vue")) {
      out.push(full);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Разбор SFC                                                          */
/* ------------------------------------------------------------------ */

/** Заменяет содержимое совпадения на пробелы, сохраняя \n и длину. */
function blankOut(text) {
  return text.replace(/[^\n]/g, " ");
}

/** Маскирует HTML-комментарии, сохраняя позиции и переводы строк. */
function maskComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, blankOut);
}

/**
 * Маскирует содержимое <script>, <style> и <i18n>, чтобы случайные
 * <template> внутри них не сбивали поиск. Длина и строки сохраняются.
 */
function maskSfcBlocks(source) {
  return source.replace(
    /<(script|style|i18n)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    blankOut
  );
}

/**
 * Извлекает верхнеуровневый блок <template> с учётом вложенности.
 * Возвращает { content, startIndex } либо null.
 */
function extractTemplate(source) {
  const openRe = /<template(?=[\s>/])[^>]*>/g;
  const opening = openRe.exec(source);
  if (!opening) return null;

  const startIndex = opening.index + opening[0].length;
  const tagRe = /<\/?template(?=[\s>/])[^>]*>/g;
  tagRe.lastIndex = opening.index;

  let depth = 0;
  let end = -1;
  let match;
  while ((match = tagRe.exec(source)) !== null) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        end = match.index;
        break;
      }
    } else {
      depth += 1;
    }
  }

  const content = source.slice(startIndex, end === -1 ? source.length : end);
  return { content, startIndex };
}

/** Маскирует интерполяции {{ ... }}, сохраняя позиции. */
function maskInterpolations(text) {
  return text.replace(/\{\{[\s\S]*?\}\}/g, blankOut);
}

/**
 * Парсит один тег, начиная с позиции "<". Корректно пропускает ">"
 * внутри кавычек. Возвращает null, если это не тег.
 */
function parseTag(text, start) {
  let index = start + 1;
  let closing = false;
  if (text[index] === "/") {
    closing = true;
    index += 1;
  }

  const nameStart = index;
  while (index < text.length && /[A-Za-z0-9_.:-]/.test(text[index])) {
    index += 1;
  }
  const name = text.slice(nameStart, index);
  if (name === "") return null;

  const attrsStart = index;
  let quote = null;
  while (index < text.length) {
    const char = text[index];
    if (quote !== null) {
      if (char === quote) quote = null;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      index += 1;
      continue;
    }
    if (char === ">") {
      const selfClosing = text.slice(attrsStart, index).trimEnd().endsWith("/");
      return {
        name: name.toLowerCase(),
        closing,
        attrsStart,
        attrsEnd: index,
        start,
        end: index + 1,
        selfClosing,
      };
    }
    index += 1;
  }

  return null;
}

function makeFragment(text) {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
}

/* ------------------------------------------------------------------ */
/* Проверка одного .vue                                                */
/* ------------------------------------------------------------------ */

function analyzeVueFile(file) {
  const relative = relativePath(file);
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    return { scanned: false, findings: [] };
  }

  // Маскируем комментарии и не-template блоки ДО извлечения template,
  // чтобы не находить ложный <template> внутри script/style.
  const maskedSource = maskSfcBlocks(maskComments(source));
  const template = extractTemplate(maskedSource);
  if (!template) return { scanned: true, findings: [] };

  const { content, startIndex } = template;
  const templateStartLine = countNewlines(maskedSource.slice(0, startIndex)) + 1;
  const lineAt = (relativeOffset) =>
    templateStartLine + countNewlines(content.slice(0, relativeOffset));

  const maskedContent = maskInterpolations(content);
  const findings = [];
  const seen = new Set();

  const addFinding = (relativeOffset, fragment, kind) => {
    const line = lineAt(relativeOffset);
    const clean = makeFragment(fragment);
    if (clean === "") return;
    const key = `${line}|${clean}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ file: relative, line, fragment: clean, kind });
  };

  // Один проход: собираем теги и текстовые узлы с родителем.
  const textNodes = [];
  const tags = [];
  const stack = [];
  let index = 0;
  let textStart = 0;
  while (index < maskedContent.length) {
    if (maskedContent[index] === "<") {
      const tag = parseTag(maskedContent, index);
      if (tag) {
        if (index > textStart) {
          textNodes.push({
            start: textStart,
            end: index,
            text: maskedContent.slice(textStart, index),
            parent: stack.length > 0 ? stack[stack.length - 1] : null,
          });
        }
        tags.push(tag);
        if (tag.closing) {
          if (stack.length > 0) {
            const top = stack[stack.length - 1];
            if (top === tag.name) {
              stack.pop();
            } else {
              const at = stack.lastIndexOf(tag.name);
              if (at !== -1) stack.splice(at, 1);
            }
          }
        } else if (!tag.selfClosing) {
          stack.push(tag.name);
        }
        index = tag.end;
        textStart = index;
        continue;
      }
    }
    index += 1;
  }
  if (textStart < maskedContent.length) {
    textNodes.push({
      start: textStart,
      end: maskedContent.length,
      text: maskedContent.slice(textStart),
      parent: stack.length > 0 ? stack[stack.length - 1] : null,
    });
  }

  // (a) кириллица в текстовых узлах.
  for (const node of textNodes) {
    const match = node.text.search(CYRILLIC);
    if (match === -1) continue;
    addFinding(node.start + match, node.text, "text");
  }

  // (b) кириллица в литеральных значениях выбранных атрибутов.
  const attrRe = /(^|\s)([:@.A-Za-z_][\w:.\-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const tag of tags) {
    if (tag.closing) continue;
    const attrs = content.slice(tag.attrsStart, tag.attrsEnd);
    let attrMatch;
    attrRe.lastIndex = 0;
    while ((attrMatch = attrRe.exec(attrs)) !== null) {
      const name = attrMatch[2].toLowerCase();
      if (!LITERAL_ATTRS.has(name)) continue;

      const rawValue = attrMatch[3] !== undefined ? attrMatch[3] : attrMatch[4];
      // Динамические биндинги и значения с интерполяцией не проверяем.
      if (rawValue.includes("{{")) continue;
      if (!CYRILLIC.test(rawValue)) continue;

      addFinding(tag.attrsStart + attrMatch.index, rawValue, "attribute");
    }
  }

  // (c) литеральный текст непосредственно внутри q-tooltip.
  for (const node of textNodes) {
    if (node.parent !== "q-tooltip") continue;
    const match = node.text.search(CYRILLIC);
    if (match === -1) continue;
    addFinding(node.start + match, node.text, "q-tooltip");
  }

  findings.sort((a, b) => a.line - b.line || compareStrings(a.fragment, b.fragment));
  return { scanned: true, findings };
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

function main() {
  let ru;
  let en;
  try {
    ru = readDictionary(RU_PATH);
    en = readDictionary(EN_PATH);
  } catch (error) {
    console.error(`i18n check FAILED: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const diff = compareDictionaries(ru, en);

  console.log("=== i18n dictionaries ===");
  console.log(`  ${relativePath(RU_PATH)}: ${ru.size} key paths`);
  console.log(`  ${relativePath(EN_PATH)}: ${en.size} key paths`);
  console.log(`  only in ru.json: ${diff.onlyRu.length}`);
  for (const key of diff.onlyRu) console.log(`only in ru.json: ${key}`);
  console.log(`  only in en.json: ${diff.onlyEn.length}`);
  for (const key of diff.onlyEn) console.log(`only in en.json: ${key}`);
  console.log(`  type mismatches: ${diff.typeMismatch.length}`);
  for (const key of diff.typeMismatch) {
    console.log(`type mismatch: ${key} (object/array vs leaf)`);
  }
  console.log(`  dictionaries: ${diff.ok ? "OK" : "MISMATCH"}`);

  console.log("");
  console.log("=== vue template scan ===");

  const files = [];
  walkVueFiles(SRC_DIR, files);
  files.sort((a, b) => compareStrings(relativePath(a), relativePath(b)));

  const allFindings = [];
  let scanned = 0;
  for (const file of files) {
    const result = analyzeVueFile(file);
    if (result.scanned) scanned += 1;
    allFindings.push(...result.findings);
  }

  for (const finding of allFindings) {
    console.log(`${finding.file}:${finding.line}: ${finding.fragment}`);
  }

  console.log("");
  console.log(`  files scanned: ${scanned}`);
  console.log(`  findings: ${allFindings.length}`);
  console.log(`  dictionaries: ${diff.ok ? "OK" : "MISMATCH"}`);

  if (!diff.ok || allFindings.length > 0) {
    console.error("");
    console.error("i18n check FAILED");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("OK: no i18n issues found (dictionaries match, no hardcoded Cyrillic)");
}

main();
