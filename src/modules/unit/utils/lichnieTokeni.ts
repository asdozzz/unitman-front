import type { Schema } from "@/api/types";

/**
 * Есть ли среди личных токенов токен, который покрывает проект и привязан
 * к тому же репозиторию.
 *
 * Правило повторяет серверную проверку `pokryvaetProekt` вместе с привязкой
 * токена к репозиторию: токен не должен быть без прав на редактирование,
 * `repoId` токена должен совпадать с `repoId` проекта, а объём прав —
 * быть либо `vse`, либо содержать проект в `proektySPushom`.
 */
export function estTokenSPushomProekta(
    tokeni: readonly Schema<"LichniyTokenPublic">[],
    proekt: { id: string; repoId: string | null },
): boolean {
    return tokeni.some((token) =>
        !token.bezPravNaRedaktirovanie
        && token.repoId === proekt.repoId
        && (
            token.obyomPrav === "vse"
            || (token.proektySPushom ?? []).includes(proekt.id)
        ),
    );
}
