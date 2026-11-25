<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import dayjs from "dayjs";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhDialog,
  GhEmptyState,
  GhIcon,
  GhLabel,
  GhPageHeader,
  GhSkeleton,
  GhSwitch,
} from "@/components/ui";
import type { GhLabelVariant, OcticonName } from "@/components/ui";
import { useStorUvedomleniy } from "@/modules/notification/store/StorUvedomleniy";
import type {
  UrovenVazhnosti,
  Uvedomlenie,
} from "@/modules/notification/model/Uvedomlenie";

const { t } = useI18n();
const route = useRoute();
const stor = useStorUvedomleniy();

const vybrannoe = ref<Uvedomlenie | null>(null);
const oknoOtkryto = ref<boolean>(false);
const tolkoVazhnie = ref<boolean>(false);

const variantPoUrovnyu: Record<UrovenVazhnosti, GhLabelVariant> = {
  info: "neutral",
  attention: "attention",
  critical: "danger",
};

const ikonkaPoUrovnyu: Record<UrovenVazhnosti, OcticonName> = {
  info: "info",
  attention: "alert",
  critical: "stop",
};

function kratkoeOpisanie(uvedomlenie: Uvedomlenie): string {
  if (uvedomlenie.type === "runner_threat") {
    return t("notifications.runner_threat.short", {
      hostname: uvedomlenie.payload.hostname || uvedomlenie.payload.runnerId || "",
      level: uvedomlenie.payload.level || "",
      memory: uvedomlenie.payload.memoryUsedPercent ?? "",
    });
  }

  return t("notifications.unit_started.short", {
    unitName:
      uvedomlenie.payload.unitName || uvedomlenie.payload.unitId || "",
  });
}

function polnoeOpisanie(uvedomlenie: Uvedomlenie): string[] {
  const payload = uvedomlenie.payload;

  if (uvedomlenie.type === "runner_threat") {
    const stroki = [
      t("notifications.runner_threat.full.runner", {
        hostname: payload.hostname || payload.runnerId || "",
      }),
      t("notifications.runner_threat.full.level", {
        level: payload.level || "",
      }),
      t("notifications.runner_threat.full.memory", {
        memory: payload.memoryUsedPercent ?? "",
      }),
    ];

    (payload.disks ?? []).forEach((disk) => {
      if (disk.level !== "critical" && disk.level !== "blocker") {
        return;
      }

      stroki.push(
        t("notifications.runner_threat.full.disk", {
          path: disk.path || "",
          percent: disk.usedPercent ?? "",
        }),
      );
    });

    if (payload.blockReason) {
      stroki.push(
        t("notifications.runner_threat.full.block_reason", {
          reason: payload.blockReason,
        }),
      );
    }

    if (payload.collectedAt) {
      stroki.push(
        t("notifications.runner_threat.full.collected_at", {
          date: dayjs.unix(payload.collectedAt).format("DD.MM.YYYY HH:mm"),
        }),
      );
    }

    return stroki;
  }

  const stroki = [
    t("notifications.unit_started.full.unit", {
      unitName: payload.unitName || payload.unitId || "",
    }),
  ];

  if (payload.projectId) {
    stroki.push(
      t("notifications.unit_started.full.project", {
        projectId: payload.projectId,
      }),
    );
  }

  if (payload.branch) {
    stroki.push(
      t("notifications.unit_started.full.branch", { branch: payload.branch }),
    );
  }

  if (payload.jobId) {
    stroki.push(
      t("notifications.unit_started.full.job", { jobId: payload.jobId }),
    );
  }

  if (payload.startedAt) {
    stroki.push(
      t("notifications.unit_started.full.started_at", {
        date: dayjs.unix(payload.startedAt).format("DD.MM.YYYY HH:mm"),
      }),
    );
  }

  return stroki;
}

function dataUvedomleniya(uvedomlenie: Uvedomlenie): string {
  return dayjs.unix(uvedomlenie.createdAt).format("DD.MM.YYYY HH:mm");
}

function otkryt(uvedomlenie: Uvedomlenie): void {
  vybrannoe.value = uvedomlenie;
  oknoOtkryto.value = true;

  if (uvedomlenie.requiresRead && !uvedomlenie.read) {
    void stor.otmetitProchitannim(uvedomlenie.id);
  }
}

function zakryt(): void {
  oknoOtkryto.value = false;
}

async function obnovit(): Promise<void> {
  await stor.zagruzit(tolkoVazhnie.value);
}

const zagruzka = computed<boolean>(() => stor.loading && !stor.loaded);

watch(tolkoVazhnie, () => {
  void obnovit();
});

function obrabotatSoobshenieServiceWorkera(event: MessageEvent): void {
  const data = event.data as { type?: string; id?: string } | null;

  if (data?.type !== "open-notification" || typeof data.id !== "string") {
    return;
  }

  const uvedomlenie = stor.poId(data.id);

  if (uvedomlenie) {
    otkryt(uvedomlenie);
  }
}

onMounted(async () => {
  await stor.zagruzit(tolkoVazhnie.value);

  const openId = route.query.open;

  if (typeof openId === "string") {
    const uvedomlenie = stor.poId(openId);

    if (uvedomlenie) {
      otkryt(uvedomlenie);
    }
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener(
      "message",
      obrabotatSoobshenieServiceWorkera,
    );
  }
});

onBeforeUnmount(() => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.removeEventListener(
      "message",
      obrabotatSoobshenieServiceWorkera,
    );
  }
});
</script>

<template>
  <div class="spisok-uvedomleniy primer">
    <GhPageHeader
      :title="t('notifications.page.title')"
      :description="t('notifications.page.description')"
      :counter="stor.unreadCount"
    >
      <template #actions>
        <GhButton
          variant="default"
          size="sm"
          icon="sync"
          :label="t('notifications.page.refresh')"
          :loading="stor.loading"
          @click="obnovit"
        />
        <GhButton
          variant="default"
          size="sm"
          icon="check"
          :label="t('notifications.page.mark_all_read')"
          :disabled="stor.unreadCount === 0"
          @click="stor.otmetitVseProchitannimi()"
        />
      </template>
    </GhPageHeader>

    <GhBanner
      v-if="stor.error"
      variant="danger"
      dismissible
      @dismiss="stor.error = ''"
    >
      {{ stor.error }}
    </GhBanner>

    <div class="spisok-uvedomleniy__toolbar">
      <GhSwitch
        v-model="tolkoVazhnie"
        :label="t('notifications.page.only_actionable')"
        :description="t('notifications.page.only_actionable_description')"
      />
    </div>

    <GhBox v-if="zagruzka" padding="md">
      <div class="spisok-uvedomleniy__skeletons">
        <GhSkeleton v-for="index in 4" :key="index" variant="text" height="40px" />
      </div>
    </GhBox>

    <GhEmptyState
      v-else-if="stor.items.length === 0"
      icon="bell"
      :title="t('notifications.page.empty_title')"
      :description="t('notifications.page.empty_description')"
    />

    <GhBox v-else padding="none">
      <button
        v-for="uvedomlenie in stor.items"
        :key="uvedomlenie.id"
        type="button"
        class="spisok-uvedomleniy__row"
        :class="{
          'spisok-uvedomleniy__row--unread':
            uvedomlenie.requiresRead && !uvedomlenie.read,
          'spisok-uvedomleniy__row--info': uvedomlenie.severity === 'info',
        }"
        @click="otkryt(uvedomlenie)"
      >
        <GhIcon
          :name="ikonkaPoUrovnyu[uvedomlenie.severity]"
          class="spisok-uvedomleniy__icon"
        />

        <span class="spisok-uvedomleniy__body">
          <span class="spisok-uvedomleniy__title">
            {{ kratkoeOpisanie(uvedomlenie) }}
          </span>
          <span class="spisok-uvedomleniy__meta">
            {{ dataUvedomleniya(uvedomlenie) }}
          </span>
        </span>

        <GhLabel
          :variant="variantPoUrovnyu[uvedomlenie.severity]"
          :label="t(`notifications.severity.${uvedomlenie.severity}`)"
        />

        <span
          v-if="uvedomlenie.requiresRead && !uvedomlenie.read"
          class="spisok-uvedomleniy__dot"
          :aria-label="t('notifications.page.unread')"
        />
      </button>
    </GhBox>

    <GhDialog
      v-model="oknoOtkryto"
      :title="t('notifications.dialog.title')"
      width="640px"
      :close-label="t('common.buttons.close')"
    >
      <div v-if="vybrannoe" class="spisok-uvedomleniy__details">
        <div class="spisok-uvedomleniy__details-head">
          <GhLabel
            :variant="variantPoUrovnyu[vybrannoe.severity]"
            :label="t(`notifications.severity.${vybrannoe.severity}`)"
          />
          <span class="spisok-uvedomleniy__details-date">
            {{ dataUvedomleniya(vybrannoe) }}
          </span>
        </div>

        <h3 class="spisok-uvedomleniy__details-title">
          {{ kratkoeOpisanie(vybrannoe) }}
        </h3>

        <p
          v-for="stroka in polnoeOpisanie(vybrannoe)"
          :key="stroka"
          class="spisok-uvedomleniy__details-line"
        >
          {{ stroka }}
        </p>
      </div>

      <template #footer>
        <GhButton
          variant="primary"
          :label="t('common.buttons.close')"
          @click="zakryt"
        />
      </template>
    </GhDialog>
  </div>
</template>

<style scoped>
.spisok-uvedomleniy {
  max-width: 960px;
}

.spisok-uvedomleniy__toolbar {
  margin-bottom: 12px;
}

.spisok-uvedomleniy__skeletons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spisok-uvedomleniy__row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  border-bottom: 1px solid var(--borderColor-default);
  background: transparent;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  text-align: left;
  cursor: pointer;
}

.spisok-uvedomleniy__row:last-child {
  border-bottom: none;
}

.spisok-uvedomleniy__row:hover {
  background-color: var(--bgColor-neutral-muted);
}

.spisok-uvedomleniy__row--unread {
  background-color: var(--bgColor-accent-muted);
}

.spisok-uvedomleniy__row--info {
  color: var(--fgColor-muted);
}

.spisok-uvedomleniy__icon {
  flex-shrink: 0;
  color: var(--fgColor-muted);
}

.spisok-uvedomleniy__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.spisok-uvedomleniy__title {
  overflow: hidden;
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spisok-uvedomleniy__row--unread .spisok-uvedomleniy__title {
  font-weight: var(--fontWeight-semibold);
}

.spisok-uvedomleniy__meta {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.spisok-uvedomleniy__dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: var(--borderRadius-full);
  background-color: var(--fgColor-accent);
}

.spisok-uvedomleniy__details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spisok-uvedomleniy__details-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.spisok-uvedomleniy__details-date {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.spisok-uvedomleniy__details-title {
  margin: 0;
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
}

.spisok-uvedomleniy__details-line {
  margin: 0;
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}
</style>
