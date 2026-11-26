#!/usr/bin/env node
/**
 * Генерация favicon-пакета Unitman из единственного мастера `public/favicon.svg`.
 *
 * Пакет:
 *   favicon.svg            — уже лежит в public, здесь не перезаписывается
 *   favicon.ico            — 16/32/48, скруглённая плитка
 *   apple-touch-icon.png   — 180×180, квадратная плитка (iOS маскирует сам)
 *   icon-192.png           — PWA
 *   icon-512.png           — PWA
 *   icon-maskable-512.png  — maskable, квадратная плитка + safe zone 20%
 *   safari-pinned-tab.svg  — одноцветный контур без плитки
 *
 * Запуск: `yarn gen:icons` или `node scripts/gen-icons.mjs`.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const publicDir = new URL("../public/", import.meta.url);
const masterUrl = new URL("favicon.svg", publicDir);

const RAZMER_IKONKI = {
  apple: 180,
  pwa192: 192,
  pwa512: 512,
  maskable: 512,
};

/** Тело мастера без обёртки <svg> — плитка и фигура. */
function razobratMaster(svg) {
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim();

  const bezPlitki = body
    .replace(/<rect[^>]*width="64"[^>]*height="64"[^>]*\/>/, "")
    .trim();

  return { body, bezPlitki };
}

function sobratSvg({ body, bezPlitki }, { radius = 14, plitka = true } = {}) {
  const osnova = plitka
    ? `<rect width="64" height="64" rx="${radius}" fill="#2f6fb0"/>\n${body}`
    : bezPlitki;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${osnova}</svg>`;
}

/** Одноцветный силуэт для Safari pinned tab: Safari использует альфу как маску. */
function monohromnyjSvg(bezPlitki) {
  const shestiugolnik = bezPlitki.match(/<polygon points="[^"]+"/)?.[0];

  if (!shestiugolnik) {
    throw new Error("В мастере favicon.svg не найден полигон куба");
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${shestiugolnik} fill="#000000"/></svg>\n`;
}

/**
 * Собирает ICO из PNG-буферов (PNG-сжатые записи поддерживают все современные
 * браузеры и Windows Vista+).
 */
function sobratIco(pngBySize) {
  const razmery = Object.keys(pngBySize)
    .map(Number)
    .sort((a, b) => a - b);

  const zagolovok = Buffer.alloc(6);
  zagolovok.writeUInt16LE(0, 0); // reserved
  zagolovok.writeUInt16LE(1, 2); // type: icon
  zagolovok.writeUInt16LE(razmery.length, 4);

  const katalog = Buffer.alloc(16 * razmery.length);
  let smeshchenie = zagolovok.length + katalog.length;

  razmery.forEach((size, i) => {
    const png = pngBySize[size];
    const b = i * 16;
    katalog.writeUInt8(size >= 256 ? 0 : size, b);
    katalog.writeUInt8(size >= 256 ? 0 : size, b + 1);
    katalog.writeUInt8(0, b + 2); // palette
    katalog.writeUInt8(0, b + 3); // reserved
    katalog.writeUInt16LE(1, b + 4); // planes
    katalog.writeUInt16LE(32, b + 6); // bit depth
    katalog.writeUInt32LE(png.length, b + 8);
    katalog.writeUInt32LE(smeshchenie, b + 12);
    smeshchenie += png.length;
  });

  return Buffer.concat([zagolovok, katalog, ...razmery.map((s) => pngBySize[s])]);
}

async function main() {
  const master = await readFile(masterUrl, "utf8");
  const chasti = razobratMaster(master);

  // UNITMAN_CHROME позволяет подставить системный/альтернативный Chromium,
  // если bundled-браузер Playwright не запускается (например, нет libasound).
  const ispolnyaemyj = process.env.UNITMAN_CHROME?.trim();
  const brauzer = await chromium.launch(
    ispolnyaemyj ? { executablePath: ispolnyaemyj } : {},
  );
  const stranica = await brauzer.newPage();

  /** Рендерит SVG ровно в size×size и возвращает PNG-буфер. */
  async function raster(svg, size) {
    await stranica.setViewportSize({ width: size, height: size });
    await stranica.setContent(
      `<!doctype html><html><head><style>
         html,body{margin:0;padding:0;background:transparent;overflow:hidden}
         svg{display:block;width:${size}px;height:${size}px}
       </style></head><body>${svg}</body></html>`,
      { waitUntil: "load" },
    );

    return stranica.screenshot({
      type: "png",
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size },
    });
  }

  // Скруглённая плитка — для вкладок браузера (.ico и основной svg).
  const skruglennaya = sobratSvg(chasti, { radius: 14 });
  // Квадратная плитка — для iOS/PWA/maskable, где маску накладывает система.
  const kvadratnaya = sobratSvg(chasti, { radius: 0 });

  const icoPng = {};
  for (const size of [16, 32, 48]) {
    icoPng[size] = await raster(skruglennaya, size);
  }

  const apple = await raster(kvadratnaya, RAZMER_IKONKI.apple);
  const pwa192 = await raster(kvadratnaya, RAZMER_IKONKI.pwa192);
  const pwa512 = await raster(kvadratnaya, RAZMER_IKONKI.pwa512);
  const maskable = await raster(kvadratnaya, RAZMER_IKONKI.maskable);

  await brauzer.close();

  const zapisi = [
    ["favicon.ico", sobratIco(icoPng)],
    ["apple-touch-icon.png", apple],
    ["icon-192.png", pwa192],
    ["icon-512.png", pwa512],
    ["icon-maskable-512.png", maskable],
    ["safari-pinned-tab.svg", monohromnyjSvg(chasti.bezPlitki)],
  ];

  for (const [imya, dannye] of zapisi) {
    await writeFile(new URL(imya, publicDir), dannye);
    console.log(`${imya}: ${dannye.length} B`);
  }
}

main().catch((oshibka) => {
  console.error(oshibka);
  process.exitCode = 1;
});
