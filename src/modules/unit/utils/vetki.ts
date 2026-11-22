/**
 * Валидация имени git-ветки.
 *
 * Функция повторяет правила бэкенда из
 * `Unitman\Business\UseCase\Project\SozdatVetkuProektaUseCase::etoKorrektnayaVetka`
 * (ограничения git на имена ref), чтобы формы, создающие ветки, показывали
 * ошибку до отправки запроса. Чистая и не зависит от внешних модулей.
 *
 * @param nazvanie Имя локальной ветки, введённое пользователем.
 * @returns Ключ i18n ошибки или пустая строка, если имя корректно.
 */
export function proveritNazvanieVetki(nazvanie: string): string {
    const ochishennoe = nazvanie.trim();

    if (ochishennoe === "") {
        return "common.validation.branch_required";
    }

    if (/\s/u.test(ochishennoe)) {
        return "common.validation.branch_no_whitespace";
    }

    // Управляющие символы запрещены git, как и в бэкенде.
    if (/[\x00-\x1F\x7F]/.test(ochishennoe)) {
        return "common.validation.branch_invalid";
    }

    if (ochishennoe.includes("..") || ochishennoe.includes("//") || ochishennoe.includes("@{")) {
        return "common.validation.branch_invalid";
    }

    // Запрещённые символы: ~ ^ : ? * [ \.
    if (/[~^:?*\[\\]/.test(ochishennoe)) {
        return "common.validation.branch_invalid";
    }

    if (
        ochishennoe.startsWith("/")
        || ochishennoe.endsWith("/")
        || ochishennoe.startsWith(".")
        || ochishennoe.endsWith(".")
    ) {
        return "common.validation.branch_invalid";
    }

    if (ochishennoe.endsWith(".lock")) {
        return "common.validation.branch_invalid";
    }

    if (ochishennoe.length > 255) {
        return "common.validation.branch_invalid";
    }

    for (const segment of ochishennoe.split("/")) {
        if (
            segment === ""
            || segment === "@"
            || segment.startsWith(".")
            || segment.endsWith(".lock")
        ) {
            return "common.validation.branch_invalid";
        }
    }

    return "";
}
