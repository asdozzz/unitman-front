import { onMounted, onUnmounted } from "vue";

/**
 * Таймаут ожидания второй клавиши в последовательности `g` + клавиша.
 * Если вторая клавиша не нажата за это время, последовательность сбрасывается.
 */
export const HOTKEYS_TIMEOUT_MS = 800;

/**
 * Общий (модульный) признак того, что после нажатия `g` ожидается вторая
 * клавиша последовательности.
 *
 * Состояние вынесено из замыкания композабла, чтобы страничные обработчики
 * (например, одиночный `R` на «Главной») могли детерминированно уступать
 * последовательности `g` + клавиша независимо от порядка регистрации
 * слушателей `keydown`.
 */
let ozhidanieVtoroyKlavishiPosledovatelnosti = false;
let tajmerOzhidaniyaPosledovatelnosti: ReturnType<typeof setTimeout> | null = null;

/**
 * Возвращает `true`, если сейчас ожидается вторая клавиша последовательности
 * `g` + клавиша. Страничные хоткеи должны в этом случае не перехватывать
 * одиночную клавишу и дать глобальному обработчику завершить навигацию.
 */
export function ozhidaetsyaVtorayaKlavishaPosledovatelnosti(): boolean {
    return ozhidanieVtoroyKlavishiPosledovatelnosti;
}

/** Сбрасывает общее ожидание второй клавиши и таймер. */
function sbrositGlobalnoeOzhidanie(): void {
    ozhidanieVtoroyKlavishiPosledovatelnosti = false;

    if (tajmerOzhidaniyaPosledovatelnosti !== null) {
        clearTimeout(tajmerOzhidaniyaPosledovatelnosti);
        tajmerOzhidaniyaPosledovatelnosti = null;
    }
}

/** Действия, которые могут быть привязаны к глобальным горячим клавишам. */
export type HotkeyActions = {
    /** `/` — перевести фокус в поиск. */
    poisk: () => void;
    /** `g h` — главная. */
    pereytiNaGlavnuyu: () => void;
    /** `g u` — юниты. */
    pereytiKUnitam: () => void;
    /** `g p` — проекты (admin). */
    pereytiKProektam: () => void;
    /** `g a` — аккаунты (admin). */
    pereytiKAkkauntam: () => void;
    /** `g r` — репозитории (admin). */
    pereytiKRepozitoriyam: () => void;
    /** `g s` — настройки. */
    pereytiKNastroikam: () => void;
    /** `\` — свернуть/развернуть сайдбар. */
    pereklyuchitSaidbar: () => void;
    /** `?` — открыть диалог «Горячие клавиши». */
    otkrytShpargalku: () => void;
};

/** Необязательные параметры композабла. */
export type HotkeysOptions = {
    /**
     * Разрешены ли хоткеи прямо сейчас (например, только для авторизованных).
     * По умолчанию — всегда.
     */
    kogdaAktivno?: () => boolean;
};

/**
 * Вторая клавиша последовательности `g` + клавиша.
 *
 * Ключи — в нижнем регистре, чтобы не зависеть от Caps Lock и раскладки для
 * латинских командных клавиш.
 */
const KARTA_POSLEDOVATELNOSTI: Record<string, keyof HotkeyActions> = {
    h: "pereytiNaGlavnuyu",
    u: "pereytiKUnitam",
    p: "pereytiKProektam",
    a: "pereytiKAkkauntam",
    r: "pereytiKRepozitoriyam",
    s: "pereytiKNastroikam",
};

/** Селекторы, внутри которых хоткеи не должны перехватываться. */
const SELEKTORY_VVODA = [
    "input",
    "textarea",
    "select",
    "[contenteditable]",
    "[role=\"textbox\"]",
    "[role=\"dialog\"]",
    ".q-dialog",
    ".q-menu",
].join(",");

/**
 * Проверяет, нужно ли игнорировать нажатие, потому что пользователь работает
 * с полем ввода или открытым всплывающим слоем.
 */
function ignorirovatVvod(event: KeyboardEvent): boolean {
    const cel = event.target;

    if (!(cel instanceof HTMLElement)) {
        return false;
    }

    if (cel.isContentEditable) {
        return true;
    }

    return cel.closest(SELEKTORY_VVODA) !== null;
}

/**
 * Глобальные горячие клавиши приложения.
 *
 * Поддерживает одиночные клавиши (`/`, `\`, `?`) и последовательность
 * `g` + клавиша с таймаутом. Нажатия в полях ввода, открытых модалках и меню,
 * а также комбинации с `ctrl`/`meta`/`alt` игнорируются. Слушатель снимается
 * при размонтировании компонента.
 */
export function useHotkeys(
    deistviya: HotkeyActions,
    options: HotkeysOptions = {},
): void {
    /** Сбрасывает ожидание второй клавиши последовательности. */
    function sbrositPosledovatelnost(): void {
        sbrositGlobalnoeOzhidanie();
    }

    /** Начинает ожидание второй клавиши после `g`. */
    function zapustitPosledovatelnost(): void {
        sbrositGlobalnoeOzhidanie();
        ozhidanieVtoroyKlavishiPosledovatelnosti = true;
        tajmerOzhidaniyaPosledovatelnosti = setTimeout(() => {
            ozhidanieVtoroyKlavishiPosledovatelnosti = false;
            tajmerOzhidaniyaPosledovatelnosti = null;
        }, HOTKEYS_TIMEOUT_MS);
    }

    /** Основной обработчик нажатия клавиши. */
    function obrabotatNazhatie(event: KeyboardEvent): void {
        if (event.defaultPrevented || event.isComposing || event.keyCode === 229) {
            return;
        }

        // Комбинации с модификаторами — зона браузера и ОС, не перехватываем.
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        if (ignorirovatVvod(event)) {
            return;
        }

        if (options.kogdaAktivno && !options.kogdaAktivno()) {
            sbrositPosledovatelnost();
            return;
        }

        const klavisha = event.key;

        if (ozhidanieVtoroyKlavishiPosledovatelnosti) {
            sbrositPosledovatelnost();

            if (event.shiftKey) {
                return;
            }

            const deistvie = KARTA_POSLEDOVATELNOSTI[klavisha.toLowerCase()];

            if (deistvie) {
                event.preventDefault();
                deistviya[deistvie]();
            }

            return;
        }

        if (klavisha === "g" || klavisha === "G") {
            // Не мешаем вводу и не считаем `g` действием: только начало
            // последовательности.
            zapustitPosledovatelnost();
            return;
        }

        if (klavisha === "/") {
            event.preventDefault();
            deistviya.poisk();
            return;
        }

        if (klavisha === "\\") {
            event.preventDefault();
            deistviya.pereklyuchitSaidbar();
            return;
        }

        if (klavisha === "?") {
            event.preventDefault();
            deistviya.otkrytShpargalku();
        }
    }

    onMounted(() => {
        window.addEventListener("keydown", obrabotatNazhatie);
    });

    onUnmounted(() => {
        window.removeEventListener("keydown", obrabotatNazhatie);
        sbrositPosledovatelnost();
    });
}
