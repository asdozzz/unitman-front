# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

## Type Support For `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
   1. Run `Extensions: Show Built-in Extensions` from VSCode's command palette
   2. Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.

## Типы API из OpenAPI

Типы запросов/ответов бэкенда Unitman не пишутся руками — они генерируются из OpenAPI-спецификации
(NelmioApiDocBundle, `GET /api/doc.json`).

### Что где лежит

| Путь | Назначение |
| --- | --- |
| [`openapi/unitman.json`](openapi/unitman.json) | снимок спецификации (коммитится, нужен для офлайн-сборки) |
| [`src/api/generated/unitman.d.ts`](src/api/generated/unitman.d.ts) | сгенерированные типы. **Не редактировать вручную** |
| [`src/api/types.ts`](src/api/types.ts) | хелперы поверх сгенерированной схемы |
| [`scripts/gen-api-types.mjs`](scripts/gen-api-types.mjs) | сам генератор |

### Команды

```bash
yarn gen:api                 # скачать спецификацию и перегенерировать типы
yarn gen:api --offline       # перегенерировать по снимку openapi/unitman.json (без сети)
yarn gen:api --file <path>   # из локального файла спецификации (json/yaml)
yarn gen:api --url <url>     # из явного URL
yarn gen:api:check           # проверить, что файл актуален (exit code 1 при расхождении)
```

### Источник спецификации

Определяется в порядке приоритета:

1. `--file <path>`
2. `--url <url>`
3. `--offline` — снимок `openapi/unitman.json`
4. переменная окружения `OPENAPI_URL`
5. `${VITE_API_HOST}/doc.json`
6. снимок `openapi/unitman.json` (последний резерв)

Переменная задаётся в `.env` / `.env.local` (шаблон — в [`.env.dist`](.env.dist)):

```dotenv
OPENAPI_URL=http://localhost:8082/api/doc.json
VITE_API_HOST=http://localhost:8082/api
```

### Префикс путей

В спецификации пути идут с префиксом `/api` (`/api/unit/list`), а `baseURL` в
[`src/bootstrap/apiClient.ts`](src/bootstrap/apiClient.ts) уже содержит `/api`. Генератор сам определяет
общий префикс всех путей и срезает его, поэтому в типах ключи выглядят как `/unit/list` — ровно то, что
передаётся в `apiClient`. Если префикс в спеке изменится, менять ничего не нужно; при необходимости его
можно задать явно через `--strip-prefix`.

### Как пользоваться в коде

Сгенерированные схемы доступны через хелпер `Schema`, а пути/тела запросов — через `ApiPath`,
`ApiRequestBody`, `ApiQuery`, `ApiPathParams`, `ApiResponseData`:

```ts
import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";

// тело запроса берётся из спецификации — опечатка в поле станет ошибкой компиляции
const params: Schema<"SozdatUnit"> = {
    projectId,
    unitName,
    branch,
};

await apiClient.post("/unit/create", params);
```

`apiClient.post/put/get` перегружены: если первым аргументом передан литерал пути из спецификации,
тело запроса проверяется автоматически.

### Ограничения контракта

- `SuccessEnvelope.data` в спецификации описан как `object | null`, поэтому тип ответа из спеки не
  выводится (`ApiResponseData` даёт `unknown`). Пока тип ответа указывается явно:
  `apiClient.post<ModelDlySpiskaUnitov[]>("/unit/list", params)`. Чтобы это исправить, нужен
  точный `data` в ответах на стороне бэкенда.
- Спецификация ожидает `values: ZnacheniePeremenoi[]` в запросах заполнения переменных и выполнения
  действий, а фронт отправляет `Record<string, string>`. Места помечены комментариями
  «ВНИМАНИЕ: расхождение с контрактом» в [`src/modules/unit/services/UnitiService.ts`](src/modules/unit/services/UnitiService.ts).

### Обновление типов после изменений бэкенда

1. Поднять бэкенд (или получить актуальный `doc.json`).
2. `yarn gen:api` — обновятся и `openapi/unitman.json`, и `src/api/generated/unitman.d.ts`.
3. `npx vue-tsc --noEmit` — компилятор покажет места, где фронт разошёлся с новым контрактом.
4. Закоммитить оба файла (`openapi/unitman.json` + `src/api/generated/unitman.d.ts`).

Так как сгенерированный файл и снимок лежат в репозитории, сборка в Docker и CI не требуют доступа к
бэкенду. Для CI можно добавить шаг `yarn gen:api --file openapi/unitman.json --check`, чтобы поймать
рассинхронизацию снимка и сгенерированных типов.
