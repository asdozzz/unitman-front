import { defineStore } from "pinia";
import SkillService from "@/modules/skill/services/SkillService";
import ProektiService from "@/modules/unit/services/ProektiService";
import type { Proekt } from "@/modules/unit/store/SpisokProektov/model/Proekt";
import {
    MAX_CONTENT_BYTES,
    MAX_DESCRIPTION_LENGTH,
    MAX_NAME_LENGTH,
    pustayaFormaNavyka,
    pystieOshibkiFormi,
    razmerVBaytah,
    slugify,
    validenSlug,
    type FormaNavykaModel,
    type Navyk,
    type OblastNavyka,
    type OshibkiFormiNavyka,
} from "@/modules/skill/model/Navyk";

export type RezhimFormiNavyka = "create" | "edit";

export type RezultatSohraneniyaNavyka = {
    id: string;
    slug: string;
};

type StorFormiNavykaState = {
    form: FormaNavykaModel;
    oshibki: OshibkiFormiNavyka;
    rezhim: RezhimFormiNavyka;
    redaktiruemyyId: string | null;
    loaderSohraneniya: boolean;
    oshibka: string | null;
    proekti: Proekt[];
    loaderProektov: boolean;
    oshibkaProektov: string | null;
    /** Список проектов уже запрошен: повторные открытия не дёргают бэкенд. */
    proektyZagruzheny: boolean;
};

function soobshchenieOshibki(response: {
    status: "fail" | "error";
    data?: { message: string };
    message?: string;
}): string {
    return response.status === "fail"
        ? (response.data?.message ?? "")
        : (response.message ?? "");
}

/**
 * Стор формы навыка.
 *
 * Форма используется и созданием (глобальным и проектным), и
 * редактированием. Slug генерируется из имени до тех пор, пока пользователь
 * не изменил его вручную; при редактировании slug заблокирован.
 */
export const useStorFormiNavyka = defineStore("StorFormiNavyka", {
    state: (): StorFormiNavykaState => ({
        form: pustayaFormaNavyka(),
        oshibki: pystieOshibkiFormi(),
        rezhim: "create",
        redaktiruemyyId: null,
        loaderSohraneniya: false,
        oshibka: null,
        proekti: [],
        loaderProektov: false,
        oshibkaProektov: null,
        proektyZagruzheny: false,
    }),

    getters: {
        estOshibki(): boolean {
            return Object.values(this.oshibki).some((znachenie: string) => znachenie !== "");
        },
    },

    actions: {
        /** Открыть форму создания с предвыбранной областью и проектами. */
        otkritSozdanie(scope: OblastNavyka = "global", projectIds: string[] = []) {
            this.rezhim = "create";
            this.redaktiruemyyId = null;
            this.form = pustayaFormaNavyka(scope);
            this.form.projectIds = scope === "project" ? [...projectIds] : [];
            this.oshibki = pystieOshibkiFormi();
            this.oshibka = null;
        },

        /** Открыть форму редактирования существующего навыка. */
        otkritRedaktirovanie(navyk: Navyk) {
            this.rezhim = "edit";
            this.redaktiruemyyId = navyk.id;
            this.form = {
                name: navyk.name,
                slug: navyk.slug,
                slugIzmenenVruchnuyu: true,
                description: navyk.description,
                content: navyk.content,
                scope: navyk.isGlobal ? "global" : "project",
                projectIds: [...navyk.projectIds],
            };
            this.oshibki = pystieOshibkiFormi();
            this.oshibka = null;
        },

        /** Загрузить доступные проекты для мультипикера области `project`. */
        async zagruzitProekty(force = false) {
            if (this.proektyZagruzheny && !force) {
                return;
            }

            this.loaderProektov = true;
            this.oshibkaProektov = null;

            const response = await ProektiService.poluchitMoiProekti({ limit: 100 });

            this.loaderProektov = false;

            if (response.status === "success") {
                this.proekti = [...(response.data ?? [])].sort((a: Proekt, b: Proekt) =>
                    a.name.localeCompare(b.name, "ru", { sensitivity: "base" }),
                );
                this.proektyZagruzheny = true;
                return;
            }

            this.proekti = [];
            this.oshibkaProektov = soobshchenieOshibki(response);
        },

        /** Изменить имя: slug обновляется автоматически, пока его не трогали. */
        ustanovitImya(name: string) {
            this.form.name = name;

            if (!this.form.slugIzmenenVruchnuyu) {
                this.form.slug = slugify(name);
            }
        },

        /** Ручное изменение slug отключает авто-генерацию. */
        ustanovitSlug(slug: string) {
            this.form.slug = slug;
            this.form.slugIzmenenVruchnuyu = true;
        },

        ustanovitOpisanie(description: string) {
            this.form.description = description;
        },

        ustanovitSoderzhimoe(content: string) {
            this.form.content = content;
        },

        ustanovitOblast(scope: OblastNavyka) {
            this.form.scope = scope;

            if (scope === "global") {
                this.form.projectIds = [];
            }
        },

        ustanovitProekty(projectIds: string[]) {
            this.form.projectIds = [...projectIds];
        },

        /** Проверить поля. Ошибки кладутся в `oshibki` как ключи i18n. */
        validirovat(): boolean {
            const oshibki = pystieOshibkiFormi();
            const name = this.form.name.trim();
            const slug = this.form.slug.trim();

            if (name === "") {
                oshibki.name = "skill.validation.name_required";
            } else if (Array.from(name).length > MAX_NAME_LENGTH) {
                oshibki.name = "skill.validation.name_too_long";
            }

            if (this.rezhim === "create") {
                if (slug === "") {
                    oshibki.slug = "skill.validation.slug_required";
                } else if (!validenSlug(slug)) {
                    oshibki.slug = "skill.validation.slug_invalid";
                }
            }

            if (Array.from(this.form.description).length > MAX_DESCRIPTION_LENGTH) {
                oshibki.description = "skill.validation.description_too_long";
            }

            if (razmerVBaytah(this.form.content) > MAX_CONTENT_BYTES) {
                oshibki.content = "skill.validation.content_too_long";
            }

            if (this.form.scope === "project" && this.form.projectIds.length === 0) {
                oshibki.projectIds = "skill.validation.projects_required";
            }

            this.oshibki = oshibki;

            return !Object.values(oshibki).some((znachenie: string) => znachenie !== "");
        },

        sbrOsitOshibku() {
            this.oshibka = null;
        },

        /**
         * Сохранить форму.
         *
         * Возвращает `{id, slug}` при успехе и `null` при ошибке. Ошибки
         * валидации остаются в `oshibki`; ошибка бэкенда — в `oshibka`.
         */
        async sohranit(): Promise<RezultatSohraneniyaNavyka | null> {
            this.oshibka = null;

            if (!this.validirovat()) {
                return null;
            }

            this.loaderSohraneniya = true;

            const name = this.form.name.trim();
            const slug = this.form.slug.trim();
            const description = this.form.description;
            const content = this.form.content;

            if (this.rezhim === "edit" && this.redaktiruemyyId !== null) {
                const id = this.redaktiruemyyId;
                const response = await SkillService.izmenit({ id, name, description, content });

                this.loaderSohraneniya = false;

                if (response.status !== "success") {
                    this.oshibka = soobshchenieOshibki(response);
                    return null;
                }

                return { id, slug: this.form.slug };
            }

            const response = await SkillService.sozdat({
                name,
                slug: slug === "" ? null : slug,
                description,
                content,
                scope: this.form.scope,
                projectIds: this.form.scope === "project" ? [...this.form.projectIds] : [],
            });

            this.loaderSohraneniya = false;

            if (response.status !== "success") {
                this.oshibka = soobshchenieOshibki(response);
                return null;
            }

            return {
                id: response.data.id,
                slug: response.data.slug,
            };
        },
    },
});
