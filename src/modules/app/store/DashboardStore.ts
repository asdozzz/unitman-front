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
    }
});
