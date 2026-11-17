# Контекст проекта (Vue 3 + TypeScript + Yarn)

## Навигация и структура
- Весь исходный код находится в `src/`.
- **Строго запрещено** читать, искать или индексировать `node_modules/`, `.yarn/`, `.pnp.*`, `yarn.lock`, `dist/`, `coverage/` и кэш сборки (`*.tsbuildinfo`, `.vite/`).
- Для проверки установленных зависимостей и доступных скриптов читай только `package.json`.

## Менеджер пакетов и команды (Yarn)
- В проекте используется **Yarn**. Никогда не используй `npm` или `npx` и не создавай `package-lock.json`.
- Для запуска скриптов и утилит используй `yarn <script>` (например, `yarn type-check`, `yarn lint`, `yarn test`).
- Для установки новых пакетов используй `yarn add <package>` (или `yarn add -D <package>`).

## Правила разработки (Vue + TS)
- Используй **Vue 3 Composition API** с синтаксисом `<script setup lang="ts">`.
- Избегай типа `any`. Явно типизируй `props`, `emits`, сторы Pinia и ответы API.
- Не редактируй вручную автогенерируемые файлы типов (`auto-imports.d.ts`, `components.d.ts`).
