import {defineStore} from "pinia";

/** Режим отображения списка юнитов. */
export type UnitListViewMode = "cards" | "workspace";

const VIEW_MODE_STORAGE_KEY = "UNIT_LIST_VIEW_MODE";

/** Сохранённый режим; неизвестное значение трактуется как карточки. */
function prochitatRezhim(): UnitListViewMode {
    const sohranenniyRezhim = localStorage.getItem(VIEW_MODE_STORAGE_KEY);

    return sohranenniyRezhim === "workspace" ? "workspace" : "cards";
}

export type SpisokUnitovViewState = {
    rezhim: UnitListViewMode;
    selectedUnitId: string | null;
};

export const useSpisokUnitovViewStore = defineStore("SpisokUnitovViewStore", {
    state: (): SpisokUnitovViewState => ({
        rezhim: prochitatRezhim(),
        selectedUnitId: null,
    }),
    actions: {
        setRezhim(rezhim: UnitListViewMode) {
            this.rezhim = rezhim;
            localStorage.setItem(VIEW_MODE_STORAGE_KEY, rezhim);
        },
        vybratUnit(unitId: string | null) {
            this.selectedUnitId = unitId;
        },
        /**
         * Держит выбор валидным после обновления списка.
         *
         * Если выбранный юнит исчез, выбирается первый доступный,
         * а для пустого списка панель деталей очищается.
         */
        sinhronizovatVibor(unitIds: string[]) {
            if (this.selectedUnitId && unitIds.includes(this.selectedUnitId)) {
                return;
            }

            this.selectedUnitId = unitIds[0] ?? null;
        },
    },
});
