import { defineStore } from 'pinia';
import DashboardService from "@/modules/app/services/DashboardService";

type StatistikaPoProektam = {
    projectId: string;
    projectName: string;
    total: number;
    active: number;
    deleted: number;
}

type DashboardState = {
    loaderStatistikiPoProektam: boolean;
    statistikaPoProektam: StatistikaPoProektam[],
    oshibkaStatistikiPoProektam: string | null
};

type ObshayaStata = {
    total: number;
    active: number;
    deleted: number;
}

export const storeDashborda = defineStore('storeDashborda', {
    state: (): DashboardState => {
        return {
            loaderStatistikiPoProektam: false,
            statistikaPoProektam: [],
            oshibkaStatistikiPoProektam: null
        };
    },
    actions: {
        async poluchitStatistikuPoProektam() {
            this.loaderStatistikiPoProektam = true;

            const response = await DashboardService.statistikaPoProektam();

            if (response.status === "success") {
                this.statistikaPoProektam = response.data;
            } else if (response.status === "fail") {
                this.statistikaPoProektam = [];
                this.oshibkaStatistikiPoProektam = response.data.message;
            } else if (response.status === "error") {
                this.statistikaPoProektam = [];
                this.oshibkaStatistikiPoProektam = response.message;
            }

            this.loaderStatistikiPoProektam = false;
        },
    },
    getters: {
        obshayaStata(): ObshayaStata {
            const result = {
                total: 0,
                active: 0,
                deleted: 0
            }

            this.statistikaPoProektam.forEach((projectStata: StatistikaPoProektam) => {
                result.total += projectStata.total;
                result.active += projectStata.active;
                result.deleted += projectStata.deleted;
            });

            return result;
        }
    }
});
