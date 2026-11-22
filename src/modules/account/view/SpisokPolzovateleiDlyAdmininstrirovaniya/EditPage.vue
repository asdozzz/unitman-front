<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { GhButton, GhPageHeader } from "@/components/ui";
import FormaIzmeneniyaNika
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaNika.vue";
import FormaIzmeneniyaRoli
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaRoli.vue";
import FormaIzmeneniyaEmail
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaEmail.vue";
import FormaIzmeneniyaParolya
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaParolya.vue";
import FormaProektovPolzovatelya
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaProektovPolzovatelya.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

/** Идентификатор аккаунта из маршрута (строка либо первый элемент массива). */
const accountId = computed<string>(() => {
  const raw = route.params.id;

  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }

  return raw ?? "";
});

function vernutsyaKSpisku(): void {
  void router.push({ name: "account_list" });
}
</script>

<template>
  <div class="account-edit primer">
    <GhPageHeader
      :title="t('account.edit.title')"
      :description="t('account.edit.description')"
    >
      <template #actions>
        <GhButton
          variant="default"
          icon="arrow-left"
          :label="t('account.edit.back')"
          @click="vernutsyaKSpisku"
        />
      </template>
    </GhPageHeader>

    <div class="account-edit__id">
      <span class="account-edit__id-label">{{ t("account.edit.account_id") }}</span>
      <span class="account-edit__id-value gh-mono" :title="accountId">{{ accountId }}</span>
    </div>

    <div class="account-edit__grid">
      <FormaIzmeneniyaParolya :id="accountId" />
      <FormaIzmeneniyaEmail :id="accountId" />
      <FormaIzmeneniyaNika :id="accountId" />
      <FormaIzmeneniyaRoli :id="accountId" />
    </div>

    <FormaProektovPolzovatelya :id="accountId" />
  </div>
</template>

<style scoped>
.account-edit {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.account-edit__id {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  font-size: var(--fontSize-caption);
}

.account-edit__id-label {
  color: var(--fgColor-muted);
}

.account-edit__id-value {
  overflow: hidden;
  color: var(--fgColor-default);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-edit__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 900px) {
  .account-edit__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
