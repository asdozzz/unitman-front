<script setup lang="ts">
import {computed, onBeforeUnmount, ref} from "vue";
import {copyToClipboard} from "quasar";
import type {Link} from "@/modules/unit/store/SpisokUnitov/model/Unit";

const props = defineProps<{
  links: Link[];
  canOpen: boolean;
}>();

/** Готовая строка для рендера: компактная метка, хвост и признаки протокола. */
type StrockaSsylki = {
  link: Link;
  /** Метка `service:port`; для старых данных без `service` — хост из URL. */
  label: string;
  /** Хвост `startUri` (или путь из URL в fallback-режиме); пустой — не выводится. */
  tail: string;
  /** Бейдж протокола для не-http ссылок; `null` — бейдж не нужен. */
  badge: string | null;
  /** Ссылку можно открыть в новой вкладке (только http/https и canOpen). */
  canNavigate: boolean;
};

/** Части старого URL для fallback-разбора, когда в `UnitLink` нет `service`. */
type ChastiSsylki = {
  label: string;
  tail: string;
};

/** Протоколы, которые браузер открывает как обычную веб-страницу. */
function mozhnoOtkryt(protocol: string): boolean {
  return protocol === "http" || protocol === "https";
}

/** Нормализует протокол: `WS`, ` ws ` и прочие варианты приводятся к нижнему регистру. */
function normalizovatProtocol(protocol: string | null | undefined): string {
  return String(protocol ?? "").trim().toLowerCase();
}

/**
 * Разбирает URL для старых данных без `service`.
 * Невалидный адрес показывается целиком как метка, без хвоста.
 */
function razobrat(path: string): ChastiSsylki {
  try {
    const url = new URL(path);
    const put = `${url.pathname}${url.search}${url.hash}`;

    return {label: url.host, tail: put !== "" && put !== "/" ? put : ""};
  } catch {
    return {label: path, tail: ""};
  }
}

/** Собирает строку ссылки из полей `UnitLink`. */
function sobratStroku(link: Link): StrockaSsylki {
  const protocol = normalizovatProtocol(link.protocol);
  const service = String(link.service ?? "").trim();
  const port = typeof link.port === "number" ? String(link.port) : "";
  const startUri = String(link.startUri ?? "").trim();
  const tail = startUri !== "" && startUri !== "/" ? startUri : "";

  const canNavigate = props.canOpen && mozhnoOtkryt(protocol);
  const badge = protocol !== "" && !mozhnoOtkryt(protocol) ? protocol : null;

  if (service !== "") {
    return {
      link,
      label: port !== "" ? `${service}:${port}` : service,
      tail,
      badge,
      canNavigate,
    };
  }

  const razobrano = razobrat(link.path);

  return {link, label: razobrano.label, tail: razobrano.tail, badge, canNavigate};
}

/** Строки для рендера: ссылка и заранее собранные части компактной строки. */
const stroki = computed(() => props.links.map(sobratStroku));

// Ид ссылки, которая только что скопирована: иконка на время меняется на галочку.
const skopirovannaya = ref<string | null>(null);
let tajmer: ReturnType<typeof setTimeout> | null = null;

/** Копирует полный URL и показывает локальный фидбек вместо Notify-тоста. */
async function skopirovat(link: Link) {
  await copyToClipboard(link.path);

  skopirovannaya.value = link.path;

  if (tajmer !== null) {
    clearTimeout(tajmer);
  }

  tajmer = setTimeout(() => {
    skopirovannaya.value = null;
    tajmer = null;
  }, 1200);
}

onBeforeUnmount(() => {
  if (tajmer !== null) {
    clearTimeout(tajmer);
    tajmer = null;
  }
});
</script>

<template>
  <div v-if="links.length > 0" class="unit-links">
    <!-- Заголовок секции заменён линией-разделителем: смысл блока очевиден. -->
    <div v-if="!canOpen" class="unit-links__hint text-caption-muted">
      <q-icon name="lock" size="12px" />
      {{ $t('unit.spisok_unitov.card.hints.links_stopped') }}
    </div>

    <div
        v-for="strocka in stroki"
        :key="strocka.link.path"
        class="unit-links__row"
    >
      <!-- http/https открываются в новой вкладке; ws/tcp и прочие — только текст с title. -->
      <a
          v-if="strocka.canNavigate"
          :href="strocka.link.path"
          class="unit-links__link"
          :title="strocka.link.path"
          :aria-label="$t('unit.spisok_unitov.card.buttons.open_link')"
          target="_blank"
          rel="noopener noreferrer"
      >
        <q-icon name="link" size="14px" class="unit-links__icon" />

        <span class="unit-links__label">{{ strocka.label }}</span>

        <span v-if="strocka.badge !== null" class="unit-links__badge">{{ strocka.badge }}</span>

        <!-- Хвост startUri: обрезка слева через bidi-трюк сохраняет конец пути. -->
        <span v-if="strocka.tail !== ''" class="unit-links__path text-mono">
          {{ strocka.tail }}
        </span>
      </a>

      <span
          v-else
          class="unit-links__link unit-links__link--static"
          :class="{'unit-links__link--disabled': !canOpen}"
          :title="strocka.link.path"
      >
        <q-icon name="link" size="14px" class="unit-links__icon" />

        <span class="unit-links__label">{{ strocka.label }}</span>

        <span v-if="strocka.badge !== null" class="unit-links__badge">{{ strocka.badge }}</span>

        <span v-if="strocka.tail !== ''" class="unit-links__path text-mono">
          {{ strocka.tail }}
        </span>
      </span>

      <q-btn
          class="unit-links__copy"
          flat
          dense
          size="sm"
          :icon="skopirovannaya === strocka.link.path ? 'check' : 'content_copy'"
          :color="skopirovannaya === strocka.link.path ? 'positive' : undefined"
          :aria-label="$t('unit.spisok_unitov.card.buttons.copy_link')"
          @click="skopirovat(strocka.link)"
      >
        <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.copy_link') }}</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<style scoped>
.unit-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  /* Вместо заголовка «Ссылки» — тонкая линия-разделитель. */
  padding-top: var(--app-space-2);
  border-top: 1px solid var(--app-border);
}

.unit-links__hint {
  display: flex;
  align-items: center;
  gap: 6px;
}

.unit-links__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 24px;
}

.unit-links__link {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--app-primary);
  text-decoration: none;
}

.unit-links__link:hover {
  text-decoration: none;
}

.unit-links__link[href]:hover .unit-links__label,
.unit-links__link[href]:hover .unit-links__path {
  text-decoration: underline;
}

/* ws/tcp и прочие: некликабельный текст, но с полным URL в title. */
.unit-links__link--static {
  color: var(--app-text);
  cursor: default;
}

.unit-links__link--disabled {
  color: var(--app-text-disabled);
  cursor: default;
  opacity: 0.55;
}

.unit-links__icon {
  flex: 0 0 auto;
  opacity: 0.75;
}

.unit-links__label {
  flex: 0 0 auto;
  max-width: 100%;
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Компактный pill протокола: ws, wss, tcp и т.п. */
.unit-links__badge {
  flex: 0 0 auto;
  padding: 0 var(--app-space-1);
  border-radius: var(--app-radius-pill);
  background: var(--app-surface-muted);
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  font-weight: 600;
  line-height: var(--app-line-height-tight);
  text-transform: lowercase;
}

.unit-links__path {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--app-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
  /* Обрезка с сохранением хвоста: логический порядок LTR, обрезка слева. */
  direction: rtl;
  text-align: left;
  unicode-bidi: plaintext;
}

/* Кнопка копирования — фиксированная колонка 28px справа. */
.unit-links__copy {
  flex: 0 0 28px;
  width: 28px;
  opacity: 0;
  transition: opacity 120ms ease;
}

.unit-links__row:hover .unit-links__copy,
.unit-links__row:focus-within .unit-links__copy {
  opacity: 1;
}

@media (hover: none) {
  .unit-links__copy {
    opacity: 1;
  }
}
</style>
