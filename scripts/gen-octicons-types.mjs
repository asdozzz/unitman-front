// Генерирует декларацию типов для @primer/octicons.
//
// Пакет не поставляет .d.ts, поэтому имена иконок выводятся из фактического
// default-экспорта установленной версии. Запуск: `node scripts/gen-octicons-types.mjs`.

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import octicons from "@primer/octicons";

const korenProekta = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const imena = Object.keys(octicons).sort();

const obyedinenie = imena.map((imya) => `  | ${JSON.stringify(imya)}`).join("\n");

const soderzhimoe = `// Сгенерировано scripts/gen-octicons-types.mjs из @primer/octicons.
// Не редактируйте вручную: список соответствует установленной версии пакета.

declare module "@primer/octicons" {
  export type OcticonOptions = {
    width?: number | string;
    height?: number | string;
    class?: string;
    "aria-label"?: string;
    role?: string;
  };

  export type OcticonName =
${obyedinenie};

  export type Octicon = {
    name: OcticonName;
    toSVG(options?: OcticonOptions): string;
  };

  const octicons: Record<OcticonName, Octicon>;
  export default octicons;
}
`;

const put = resolve(korenProekta, "src/types/primer-octicons.d.ts");
writeFileSync(put, soderzhimoe, "utf8");
console.log(`Сгенерировано ${imena.length} имён иконок: ${put}`);
