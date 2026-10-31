import type { paths } from "@/api/generated/unitman";

/**
 * Подставляет значений в шаблон пути OpenAPI.
 *
 * Возвращает исходный литеральный тип шаблона, поэтому результат можно
 * передать в `apiClient` и получить типизированный ответ:
 *
 * ```ts
 * apiClient.post(buildPath('/project/read/{id}', { id }))
 * //    ^ ApiResponse<ProjectListItem>
 * ```
 */
export function buildPath<P extends keyof paths>(
    template: P,
    params: Record<string, string | number>,
): P {
    const url = (template as string).replace(/\{([^}]+)\}/g, (_match: string, key: string): string => {
        const value = params[key];

        return value === undefined ? `{${key}}` : encodeURIComponent(String(value));
    });

    return url as P;
}
