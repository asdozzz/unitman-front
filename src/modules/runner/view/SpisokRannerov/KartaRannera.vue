<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { GhIcon, GhLabel, GhProgress } from "@/components/ui";
import type { GhLabelVariant, OcticonName } from "@/components/ui";
import type { RannerKarta, UrovenResursov } from "@/modules/runner/model/ResursiServera";
import {
  IKONKA_UROVNYA,
  VARIANT_UROVNYA,
  formatirovatBayty,
  urovenPoProcentu,
} from "@/modules/runner/utils/urovniResursov";

const props = defineProps<{
  karta: RannerKarta;
}>();

const { t, locale } = useI18n();

const resursi = computed(() => props.karta.resources);

/**
 * Память из легаси-снимка `/proc/meminfo`: старый health-push не содержит
 * структурированных ресурсов, но позволяет показать хотя бы память.
 */
const legacyPamyat = computed<{
  total: number;
  used: number;
  free: number;
  percent: number;
} | null>(() => {
  const info = props.karta.memoryInfo;
  const total = (info?.totalAsKb ?? 0) * 1024;

  if (!Number.isFinite(total) || total <= 0) {
    return null;
  }

  const free = Math.max(0, (info?.freeAsKb ?? 0) * 1024);
  const used = Math.max(0, total - free);

  return {
    total,
    used,
    free,
    percent: Math.round((used / total) * 10000) / 100,
  };
});

const urovenLegacyPamyat = computed<UrovenResursov>(() =>
  urovenPoProcentu(legacyPamyat.value?.percent ?? 0),
);

const sostoyanieHealth = computed<{ variant: GhLabelVariant; icon: OcticonName; label: string }>(() => {
  if (!props.karta.active) {
    return {
      variant: "neutral",
      icon: "circle-slash",
      label: t("runner.runners_page.status_inactive"),
    };
  }

  if (!props.karta.healthFresh) {
    return {
      variant: "attention",
      icon: "clock",
      label: t("runner.runners_page.status_stale"),
    };
  }

  return {
    variant: "success",
    icon: "check-circle",
    label: t("runner.runners_page.status_active"),
  };
});

function podpisUrovnya(level: UrovenResursov): string {
  return t(`runner.levels.${level}`);
}

/** Unix-время в локальную строку. */
function formatirovatDatu(unixtime: number): string {
  if (!Number.isFinite(unixtime) || unixtime <= 0) {
    return "—";
  }

  return new Date(unixtime * 1000).toLocaleString(locale.value);
}
</script>

<template>
  <GhBox
    padding="md"
    class="runner-card"
    :class="`runner-card--${karta.level}`"
  >
    <div class="runner-card__header">
      <div class="runner-card__identity">
        <GhIcon name="server" :size="16" />
        <span class="runner-card__id gh-mono" :title="karta.id">{{ karta.id }}</span>
      </div>

      <div class="runner-card__badges">
        <GhLabel
          :variant="sostoyanieHealth.variant"
          :icon="sostoyanieHealth.icon"
          :label="sostoyanieHealth.label"
        />
        <GhLabel
          :variant="VARIANT_UROVNYA[karta.level]"
          :icon="IKONKA_UROVNYA[karta.level]"
          :label="podpisUrovnya(karta.level)"
        />
      </div>
    </div>

    <p class="runner-card__meta">
      {{ t("runner.runners_page.task_queue") }}:
      <code>{{ karta.taskQueue }}</code>
      · {{ t("runner.runners_page.last_health") }}:
      {{ formatirovatDatu(karta.lastHealthAt) }}
    </p>

    <p v-if="karta.blocked" class="runner-card__blocked">
      {{ karta.blockReason || t("runner.runners_page.blocked") }}
    </p>

    <template v-if="resursi">
      <div class="runner-card__metrics">
        <div class="runner-card__metric">
          <div class="runner-card__metric-header">
            <span>{{ t("runner.runners_page.memory") }}</span>
            <GhLabel
              :variant="VARIANT_UROVNYA[resursi.memory.level]"
              :label="podpisUrovnya(resursi.memory.level)"
            />
          </div>
          <GhProgress
            :value="resursi.memory.usedPercent"
            :level="resursi.memory.level"
            :label="t('runner.runners_page.used')"
            size="sm"
          />
          <dl class="runner-card__params">
            <div>
              <dt>{{ t("runner.runners_page.total") }}</dt>
              <dd>{{ formatirovatBayty(resursi.memory.totalBytes) }}</dd>
            </div>
            <div>
              <dt>{{ t("runner.runners_page.used") }}</dt>
              <dd>{{ formatirovatBayty(resursi.memory.usedBytes) }}</dd>
            </div>
            <div>
              <dt>{{ t("runner.runners_page.free") }}</dt>
              <dd>{{ formatirovatBayty(resursi.memory.availableBytes) }}</dd>
            </div>
          </dl>
        </div>

        <div class="runner-card__metric">
          <div class="runner-card__metric-header">
            <span>{{ t("runner.runners_page.cpu") }}</span>
          </div>
          <!-- CPU справочно: не участвует в оценке угрозы и блокировках. -->
          <GhProgress
            :value="resursi.cpu.usagePercent"
            level="neutral"
            :label="t('runner.runners_page.usage')"
            size="sm"
          />
          <dl class="runner-card__params">
            <div>
              <dt>{{ t("runner.runners_page.usage") }}</dt>
              <dd>{{ resursi.cpu.usagePercent.toFixed(1) }}%</dd>
            </div>
            <div>
              <dt>{{ t("runner.runners_page.cores") }}</dt>
              <dd>{{ resursi.cpu.cores }}</dd>
            </div>
            <div>
              <dt>{{ t("runner.runners_page.load_average") }}</dt>
              <dd>
                {{ resursi.cpu.load1.toFixed(2) }} /
                {{ resursi.cpu.load5.toFixed(2) }} /
                {{ resursi.cpu.load15.toFixed(2) }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div v-if="resursi.disks.length > 0" class="runner-card__disks">
        <h3 class="runner-card__section-title">
          {{ t("runner.runners_page.disks") }}
        </h3>
        <div
          v-for="disk in resursi.disks"
          :key="disk.path"
          class="runner-card__disk"
        >
          <div class="runner-card__metric-header">
            <span class="runner-card__disk-path gh-mono" :title="disk.path">{{ disk.path }}</span>
            <GhLabel
              :variant="VARIANT_UROVNYA[disk.level]"
              :label="podpisUrovnya(disk.level)"
            />
          </div>
          <GhProgress
            :value="disk.usedPercent"
            :level="disk.level"
            :label="t('runner.runners_page.used')"
            size="sm"
          />
          <dl class="runner-card__params">
            <div>
              <dt>{{ t("runner.runners_page.total") }}</dt>
              <dd>{{ formatirovatBayty(disk.totalBytes) }}</dd>
            </div>
            <div>
              <dt>{{ t("runner.runners_page.used") }}</dt>
              <dd>{{ formatirovatBayty(disk.usedBytes) }}</dd>
            </div>
            <div>
              <dt>{{ t("runner.runners_page.free") }}</dt>
              <dd>{{ formatirovatBayty(disk.availableBytes) }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div v-if="resursi.docker" class="runner-card__docker">
        <h3 class="runner-card__section-title">
          {{ t("runner.runners_page.docker") }}
        </h3>
        <dl class="runner-card__dl">
          <div>
            <dt>{{ t("runner.runners_page.docker_layers") }}</dt>
            <dd>{{ formatirovatBayty(resursi.docker.layersBytes) }}</dd>
          </div>
          <div>
            <dt>{{ t("runner.runners_page.docker_containers") }}</dt>
            <dd>{{ formatirovatBayty(resursi.docker.containersBytes) }}</dd>
          </div>
          <div>
            <dt>{{ t("runner.runners_page.docker_volumes") }}</dt>
            <dd>{{ formatirovatBayty(resursi.docker.volumesBytes) }}</dd>
          </div>
          <div>
            <dt>{{ t("runner.runners_page.docker_build_cache") }}</dt>
            <dd>{{ formatirovatBayty(resursi.docker.buildCacheBytes) }}</dd>
          </div>
          <div>
            <dt>{{ t("runner.runners_page.docker_total") }}</dt>
            <dd>{{ formatirovatBayty(resursi.docker.totalBytes) }}</dd>
          </div>
        </dl>
      </div>
    </template>

    <template v-else-if="legacyPamyat">
      <div class="runner-card__metric">
        <div class="runner-card__metric-header">
          <span>{{ t("runner.runners_page.memory") }}</span>
          <GhLabel
            :variant="VARIANT_UROVNYA[urovenLegacyPamyat]"
            :label="podpisUrovnya(urovenLegacyPamyat)"
          />
        </div>
        <GhProgress
          :value="legacyPamyat.percent"
          :level="urovenLegacyPamyat"
          :label="t('runner.runners_page.used')"
          size="sm"
        />
        <dl class="runner-card__params">
          <div>
            <dt>{{ t("runner.runners_page.total") }}</dt>
            <dd>{{ formatirovatBayty(legacyPamyat.total) }}</dd>
          </div>
          <div>
            <dt>{{ t("runner.runners_page.used") }}</dt>
            <dd>{{ formatirovatBayty(legacyPamyat.used) }}</dd>
          </div>
          <div>
            <dt>{{ t("runner.runners_page.free") }}</dt>
            <dd>{{ formatirovatBayty(legacyPamyat.free) }}</dd>
          </div>
        </dl>
      </div>

      <p class="runner-card__note">
        {{ t("runner.runners_page.legacy_note") }}
      </p>
    </template>

    <p v-else class="runner-card__meta runner-card__meta--muted">
      {{ t("runner.runners_page.no_resources") }}
    </p>
  </GhBox>
</template>

<style scoped>
.runner-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

/* Чёрный уровень: карточка визуально выделяется рамкой. */
.runner-card--blocker {
  border-color: var(--fgColor-default);
  box-shadow: inset 3px 0 0 var(--fgColor-default);
}

.runner-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.runner-card__identity {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.runner-card__id {
  overflow: hidden;
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runner-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.runner-card__meta {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  overflow-wrap: anywhere;
}

.runner-card__meta--muted {
  margin-top: 4px;
}

.runner-card__meta code {
  color: var(--fgColor-default);
  font-size: inherit;
}

.runner-card__blocked {
  margin: 0;
  padding: 6px 8px;
  background-color: var(--bgColor-danger-muted);
  border: 1px solid var(--borderColor-danger-muted);
  border-radius: 6px;
  color: var(--fgColor-danger);
  font-size: var(--fontSize-caption);
}

.runner-card__note {
  margin: 0;
  padding: 6px 8px;
  background-color: var(--bgColor-attention-muted);
  border: 1px solid var(--borderColor-attention-muted);
  border-radius: 6px;
  color: var(--fgColor-attention);
  font-size: var(--fontSize-caption);
}

.runner-card__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.runner-card__metric,
.runner-card__disk {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.runner-card__metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-medium);
}

.runner-card__params {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3px 12px;
  margin: 0;
  font-size: var(--fontSize-caption);
}

.runner-card__params > div {
  display: contents;
}

.runner-card__params dt {
  color: var(--fgColor-muted);
}

.runner-card__params dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.runner-card__section-title {
  margin: 0 0 8px;
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  color: var(--fgColor-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.runner-card__disks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.runner-card__disk-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.runner-card__dl {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 12px;
  margin: 0;
  font-size: var(--fontSize-caption);
}

.runner-card__dl > div {
  display: contents;
}

.runner-card__dl dt {
  color: var(--fgColor-muted);
}

.runner-card__dl dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
