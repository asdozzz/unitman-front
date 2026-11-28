import { describe, expect, it } from "vitest";
import {
    klyuchOshibkiNavyka,
    normalizovatKratkuyu,
    razmerVBaytah,
    slugify,
    validenSlug,
} from "@/modules/skill/model/Navyk";

describe("Navyk: slug и валидация", () => {
    it("транслитерирует кириллицу и заменяет разделители дефисами", () => {
        expect(slugify("Мой навык: сборка проекта")).toBe("moy-navyk-sborka-proekta");
    });

    it("обрезает дефисы по краям и ограничивает длину 64 символами", () => {
        const slug = slugify(`  ---${"a".repeat(80)}---  `);

        expect(slug).toHaveLength(64);
        expect(slug.startsWith("-")).toBe(false);
        expect(slug.endsWith("-")).toBe(false);
    });

    it("проверяет slug по контракту бэкенда", () => {
        expect(validenSlug("skill-1")).toBe(true);
        expect(validenSlug("1skill")).toBe(true);
        expect(validenSlug("-skill")).toBe(false);
        expect(validenSlug("Skill")).toBe(false);
        expect(validenSlug("")).toBe(false);
    });

    it("считает размер содержимого в UTF-8 байтах", () => {
        expect(razmerVBaytah("abc")).toBe(3);
        expect(razmerVBaytah("навык")).toBe(10);
    });
});

describe("Navyk: ошибки бэкенда", () => {
    it("преобразует код в ключ i18n", () => {
        expect(klyuchOshibkiNavyka("skill.slug.taken")).toBe("skill.errors.slug.taken");
        expect(klyuchOshibkiNavyka("account.not_authenticated")).toBe(
            "skill.errors.not_authenticated",
        );
    });

    it("не трогает коды других модулей", () => {
        expect(klyuchOshibkiNavyka("opencode.turn.failed")).toBeNull();
    });
});

describe("Navyk: нормализация краткой карточки", () => {
    it("дополняет отсутствующие поля безопасными значениями", () => {
        const navyk = normalizovatKratkuyu({ id: "skill-1" });

        expect(navyk.name).toBe("skill-1");
        expect(navyk.projectIds).toEqual([]);
        expect(navyk.version).toBe(1);
        expect(navyk.archived).toBe(false);
    });
});
