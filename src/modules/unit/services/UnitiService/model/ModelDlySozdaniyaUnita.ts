type ZnacheniePeremenoi = {
    id: string;
    value: string;
    type: string;
}

export type ModelDlySozdaniyaUnita = {
    projectId: string;
    unitName: string;
    branch: string;
    memoryLimit: number;
    znacheniePeremenoi: ZnacheniePeremenoi[]
}

