// Клиентская валидация масок защищённых веток.
//
// Правила повторяют ограничения бэкенда: непустая строка, длина 1..256,
// без дублей, не более 50 масок на проект. Символ звёздочки трактуется
// как wildcard (как в GitLab) и дополнительно не проверяется.

export const MAKSIMUM_MASOK = 50;
export const MAKSIMALNAYA_DLINA_MASKI = 256;

export type OshibkaMaski = "empty" | "too_long" | "duplicate" | "too_many" | null;

// Проверяет маску, которую пользователь хочет добавить к уже существующему
// списку.
//
// maska    - введённая пользователем маска (может содержать пробелы по краям).
// tekushie - текущий список масок.
// Возвращает код ошибки либо null, если маску можно добавить.
export function proveritMaskuVetki(maska: string, tekushie: string[]): OshibkaMaski {
    const znachenie = maska.trim();

    if (znachenie.length === 0) {
        return "empty";
    }

    if (znachenie.length > MAKSIMALNAYA_DLINA_MASKI) {
        return "too_long";
    }

    if (tekushie.includes(znachenie)) {
        return "duplicate";
    }

    if (tekushie.length >= MAKSIMUM_MASOK) {
        return "too_many";
    }

    return null;
}

// Экранирует спецсимволы регулярного выражения, чтобы маска трактовалась
// буквально (кроме звёздочки, которая заменяется отдельно).
function ekranirovatRegexp(znachenie: string): string {
    return znachenie.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

// Проверяет, попадает ли ветка под маску.
//
// Семантика как в GitLab: `*` матчит любую последовательность символов,
// включая `/`, поэтому `release/*` покрывает `release/1.2`. Точное
// совпадение (без звёздочек) тоже считается попаданием. Якоря `^...$`
// не дают маске совпасть лишь с частью названия ветки.
export function vetkaSootvetstvuetPatternu(vetka: string, pattern: string): boolean {
    if (pattern.length === 0) {
        return false;
    }

    const virazhenie = "^" + ekranirovatRegexp(pattern).replace(/\*/g, ".*") + "$";

    return new RegExp(virazhenie).test(vetka);
}

// Возвращает первую маску из списка, под которую попадает ветка, либо null.
//
// Именно маска (а не булево значение) нужна, чтобы показать пользователю,
// какое правило проекта сработало.
export function soderzhitZashishennuyuVetku(vetki: string[], vetka: string): string | null {
    for (const pattern of vetki) {
        if (vetkaSootvetstvuetPatternu(vetka, pattern)) {
            return pattern;
        }
    }

    return null;
}
