<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { GhButton, GhDialog, GhKbd } from "@/components/ui";

const props = withDefaults(
    defineProps<{
        modelValue?: boolean;
    }>(),
    {
        modelValue: false,
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
}>();

const { t } = useI18n();

type StrokKlavishi = {
    id: string;
    /** Клавиши комбинации в порядке нажатия. */
    klavishi: string[];
    opisanie: string;
};

type GruppaKlavish = {
    id: string;
    title: string;
    items: StrokKlavishi[];
};

const gruppy = computed<GruppaKlavish[]>(() => [
    {
        id: "navigation",
        title: t("hotkeys.groups.navigation"),
        items: [
            {
                id: "search",
                klavishi: ["/"],
                opisanie: t("hotkeys.items.search"),
            },
            {
                id: "home",
                klavishi: ["g", "h"],
                opisanie: t("hotkeys.items.home"),
            },
            {
                id: "units",
                klavishi: ["g", "u"],
                opisanie: t("hotkeys.items.units"),
            },
            {
                id: "projects",
                klavishi: ["g", "p"],
                opisanie: t("hotkeys.items.projects"),
            },
            {
                id: "accounts",
                klavishi: ["g", "a"],
                opisanie: t("hotkeys.items.accounts"),
            },
            {
                id: "repositories",
                klavishi: ["g", "r"],
                opisanie: t("hotkeys.items.repositories"),
            },
            {
                id: "settings",
                klavishi: ["g", "s"],
                opisanie: t("hotkeys.items.settings"),
            },
        ],
    },
    {
        id: "actions",
        title: t("hotkeys.groups.actions"),
        items: [
            {
                id: "sidebar",
                klavishi: ["\\"],
                opisanie: t("hotkeys.items.toggle_sidebar"),
            },
            {
                id: "help",
                klavishi: ["?"],
                opisanie: t("hotkeys.items.help"),
            },
        ],
    },
]);

function zakrit(): void {
    emit("update:modelValue", false);
}
</script>

<template>
    <GhDialog
        :model-value="props.modelValue"
        :title="t('hotkeys.title')"
        :close-label="t('common.buttons.close')"
        width="520px"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <p class="hotkeys__description">
            {{ t("hotkeys.description") }}
        </p>

        <section
            v-for="gruppa in gruppy"
            :key="gruppa.id"
            class="hotkeys__group"
        >
            <h3 class="hotkeys__group-title">{{ gruppa.title }}</h3>

            <ul class="hotkeys__list">
                <li
                    v-for="strok in gruppa.items"
                    :key="strok.id"
                    class="hotkeys__row"
                >
                    <span class="hotkeys__opisanie">{{ strok.opisanie }}</span>

                    <span class="hotkeys__klavishi">
                        <GhKbd
                            v-for="(klavisha, index) in strok.klavishi"
                            :key="`${strok.id}-${index}`"
                        >
                            {{ klavisha }}
                        </GhKbd>
                    </span>
                </li>
            </ul>
        </section>

        <template #footer>
            <GhButton
                variant="default"
                :label="t('common.buttons.close')"
                @click="zakrit"
            />
        </template>
    </GhDialog>
</template>

<style scoped>
.hotkeys__description {
    margin: 0 0 16px;
    color: var(--fgColor-muted);
    font-size: var(--fontSize-body);
    line-height: var(--lineHeight-normal);
}

.hotkeys__group + .hotkeys__group {
    margin-top: 16px;
}

.hotkeys__group-title {
    margin: 0 0 8px;
    color: var(--fgColor-muted);
    font-size: var(--fontSize-caption);
    font-weight: var(--fontWeight-semibold);
}

.hotkeys__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0;
    margin: 0;
    list-style: none;
}

.hotkeys__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 28px;
}

.hotkeys__opisanie {
    font-size: var(--fontSize-body);
}

.hotkeys__klavishi {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
}
</style>
