<script setup lang="ts">
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhLabel,
  GhSkeleton,
  GhSwitch,
} from "@/components/ui";
import { useStorNastroekUvedomleniy } from "@/modules/notification/store/StorNastroekUvedomleniy";
import { useStorPushUvedomleniy } from "@/modules/notification/store/StorPushUvedomleniy";
import type { TipUvedomleniya } from "@/modules/notification/model/Uvedomlenie";

const { t } = useI18n();
const push = useStorPushUvedomleniy();
const nastroiki = useStorNastroekUvedomleniy();

function podpisPush(): string {
  if (!push.podderzhka) {
    return t("notifications.push.unsupported");
  }

  if (push.razreshenie === "denied") {
    return t("notifications.push.permission_denied");
  }

  return push.podpisan
    ? t("notifications.push.enabled")
    : t("notifications.push.disabled");
}

async function pereklyuchitPush(znachenie: boolean): Promise<void> {
  if (znachenie) {
    await push.vklyuchit();
  } else {
    await push.vykluchit();
  }
}

function nazvanieTipa(type: TipUvedomleniya): string {
  return t(`notifications.types.${type}.title`);
}

function opisanieTipa(type: TipUvedomleniya): string {
  return t(`notifications.types.${type}.description`);
}

async function pereklyuchitTip(
  type: TipUvedomleniya,
  znachenie: boolean,
): Promise<void> {
  await nastroiki.izmenit(type, znachenie);
}

onMounted(() => {
  void push.proverit();
  void nastroiki.zagruzit();
});
</script>

<template>
  <div class="tab-uvedomleniya">
    <GhBanner
      v-if="push.error"
      variant="danger"
      dismissible
      @dismiss="push.error = ''"
    >
      {{ push.error }}
    </GhBanner>

    <GhBanner
      v-if="nastroiki.error"
      variant="danger"
      dismissible
      @dismiss="nastroiki.error = ''"
    >
      {{ nastroiki.error }}
    </GhBanner>

    <GhBox class="tab-uvedomleniya__box">
      <template #header>
        <span>{{ t("notifications.push.section_title") }}</span>
        <GhLabel
          :variant="push.podpisan ? 'success' : 'neutral'"
          :label="podpisPush()"
        />
      </template>

      <div class="tab-uvedomleniya__push-row">
        <GhSwitch
          :model-value="push.podpisan"
          :label="t('notifications.push.switch_label')"
          :description="t('notifications.push.switch_description')"
          :disabled="!push.mozhnoVklyuchit || push.loading"
          :aria-label="t('notifications.push.switch_label')"
          @update:model-value="pereklyuchitPush"
        />

        <GhButton
          v-if="push.razreshenie === 'denied'"
          variant="default"
          size="sm"
          icon="shield"
          :label="t('notifications.push.reset_hint')"
          disabled
        />
      </div>

      <p class="tab-uvedomleniya__hint">
        {{ t("notifications.push.https_hint") }}
      </p>
    </GhBox>

    <GhBox class="tab-uvedomleniya__box">
      <template #header>
        <span>{{ t("notifications.preferences.section_title") }}</span>
      </template>

      <div v-if="nastroiki.loading" class="tab-uvedomleniya__skeletons">
        <GhSkeleton variant="text" height="32px" />
        <GhSkeleton variant="text" height="32px" />
      </div>

      <div v-else class="tab-uvedomleniya__types">
        <div
          v-for="nastroika in nastroiki.items"
          :key="nastroika.type"
          class="tab-uvedomleniya__type"
        >
          <div class="tab-uvedomleniya__type-text">
            <span class="tab-uvedomleniya__type-title">
              {{ nazvanieTipa(nastroika.type) }}
            </span>
            <span class="tab-uvedomleniya__type-description">
              {{ opisanieTipa(nastroika.type) }}
            </span>
          </div>

          <div class="tab-uvedomleniya__type-control">
            <GhLabel
              v-if="!nastroika.canDisable"
              variant="neutral"
              :label="t('notifications.preferences.system_locked')"
            />
            <GhSwitch
              :model-value="nastroika.enabled"
              :disabled="
                !nastroika.canDisable ||
                nastroiki.savingType === nastroika.type
              "
              :aria-label="nazvanieTipa(nastroika.type)"
              @update:model-value="
                (znachenie: boolean) =>
                  pereklyuchitTip(nastroika.type, znachenie)
              "
            />
          </div>
        </div>
      </div>
    </GhBox>
  </div>
</template>

<style scoped>
.tab-uvedomleniya {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px;
}

.tab-uvedomleniya__push-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tab-uvedomleniya__hint {
  margin: 12px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.tab-uvedomleniya__skeletons,
.tab-uvedomleniya__types {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tab-uvedomleniya__type {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--borderColor-default);
}

.tab-uvedomleniya__type:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.tab-uvedomleniya__type-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tab-uvedomleniya__type-title {
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-medium);
}

.tab-uvedomleniya__type-description {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.tab-uvedomleniya__type-control {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}
</style>
