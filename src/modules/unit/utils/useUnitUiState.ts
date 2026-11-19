import {computed, type ComputedRef} from "vue";
import {storeToRefs} from "pinia";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {deriveUnitUiState, type UnitUiState} from "@/modules/unit/utils/unitStatus";

/**
 * Вычисляет визуальное состояние юнита через помощники стора.
 *
 * Принимает геттер, чтобы работать и с пропсом карточки, и с элементом
 * компактного списка, не создавая второй набор условий.
 */
export function useUnitUiState(unit: () => Unit): ComputedRef<UnitUiState> {
    const unitiStore = useSpisokUnitovStore();
    const {
        esliZapushen,
        esliJdemRunner,
        nazvanieTekusheiZadachi,
    } = storeToRefs(unitiStore);

    return computed<UnitUiState>(() => {
        const tekushiiUnit = unit();

        return deriveUnitUiState({
            zapushen: esliZapushen.value(tekushiiUnit),
            error: tekushiiUnit.error,
            zanyat: esliJdemRunner.value(tekushiiUnit),
            tekushayaZadacha: nazvanieTekusheiZadachi.value(tekushiiUnit),
            commands: tekushiiUnit.commands,
        });
    });
}
