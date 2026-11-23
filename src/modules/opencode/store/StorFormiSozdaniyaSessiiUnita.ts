import { defineStore } from "pinia";
import UnitSessionService from "@/modules/opencode/services/UnitSessionService";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { useStorSpiskaSessiyUnita } from "@/modules/opencode/store/StorSpiskaSessiyUnita";
import type { Schema } from "@/api/types";
import type { RekvizityOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";
import {
    modeliRekvizitov,
    modelPoUmolchaniyu,
    normalizovatModel,
} from "@/modules/opencode/model/ModeliOpenCode";

type StorFormiSozdaniyaSessiiUnitaState = {
    otkrita: boolean;
    unitId: string;
    unitLabel: string;
    unitDescription: string;
    title: string;
    credentialId: string;
    /** Выбранная модель хода; пустая строка — дефолт реквизитов. */
    model: string;
    loader: boolean;
    oshibkaOtBackenda: string | null;
};

/**
 * Форма создания unit-сессии.
 *
 * Юнит задаётся контекстом открытия и не выбирается в форме: сессия создаётся
 * из карточки конкретного юнита. Один юнит — одна активная сессия.
 */
export const useStorFormiSozdaniyaSessiiUnita = defineStore("StorFormiSozdaniyaSessiiUnita", {
    state: (): StorFormiSozdaniyaSessiiUnitaState => {
        return {
            otkrita: false,
            unitId: "",
            unitLabel: "",
            unitDescription: "",
            title: "",
            credentialId: "",
            model: "",
            loader: false,
            oshibkaOtBackenda: null,
        };
    },

    getters: {
        rekvizity(): Schema<"OpenCodeCredential">[] {
            return useStorSpiskaRekvizitovOpenCode().spisok;
        },

        /** Полные реквизиты выбранного ключа (с моделями провайдера). */
        vybrannieRekvizity(state): RekvizityOpenCode | null {
            return useStorSpiskaRekvizitovOpenCode().rekvizityPoId(state.credentialId);
        },

        /** Модели, доступные для выбранных реквизитов. */
        dostupnieModeli(): string[] {
            return modeliRekvizitov(this.vybrannieRekvizity);
        },

        /** Модель по умолчанию выбранных реквизитов. */
        modelPoUmolchaniyu(): string {
            return modelPoUmolchaniyu(this.vybrannieRekvizity);
        },

        mozhnoSohranit(state): boolean {
            return !state.loader
                && state.unitId !== ""
                && state.credentialId !== "";
        },
    },

    actions: {
        /**
         * Открыть форму для конкретного юнита.
         */
        otkrit(params: {
            unitId: string;
            unitLabel: string;
            unitDescription: string;
        }) {
            const rekvizity = useStorSpiskaRekvizitovOpenCode().spisok;
            const pervaya = rekvizity.length > 0 ? rekvizity[0] : null;

            this.otkrita = true;
            this.unitId = params.unitId;
            this.unitLabel = params.unitLabel;
            this.unitDescription = params.unitDescription;
            this.title = "";
            this.credentialId = pervaya?.id ?? "";
            this.model = modelPoUmolchaniyu(pervaya);
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },

        /**
         * Сменить реквизиты и сбросить модель на их дефолт.
         *
         * Модель предыдущих реквизитов может быть недоступна новым, поэтому
         * при смене ключа выбор всегда сбрасывается на `defaultModel`.
         */
        ustanovitRekvizity(credentialId: string) {
            this.credentialId = credentialId;
            this.model = modelPoUmolchaniyu(
                useStorSpiskaRekvizitovOpenCode().rekvizityPoId(credentialId),
            );
        },

        /** Записать выбранную модель; `null` очищает выбор до дефолта. */
        ustanovitModel(model: string | null) {
            this.model = model ?? "";
        },

        zakrit() {
            this.otkrita = false;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },

        async sohranit(): Promise<string | null> {
            if (!this.mozhnoSohranit) {
                return null;
            }

            this.loader = true;
            this.oshibkaOtBackenda = null;

            const title = this.title.trim();

            const response = await UnitSessionService.sozdat({
                credentialId: this.credentialId,
                title: title === "" ? null : title,
                unitId: this.unitId,
                // Пустую модель не отправляем: бэкенд возьмёт дефолт реквизитов.
                model: normalizovatModel(this.model) ?? undefined,
            });

            this.loader = false;

            if (response.status === "success") {
                this.otkrita = false;

                return response.data.id;
            }

            this.oshibkaOtBackenda = response.status === "fail"
                ? response.data.message
                : response.message;

            return null;
        },

        async sozdatIDobavitVSpiske(): Promise<string | null> {
            const id = await this.sohranit();

            if (id !== null) {
                await useStorSpiskaSessiyUnita().poluchitSpisok();
            }

            return id;
        },
    },
});
