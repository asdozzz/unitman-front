type Peremenaya = {
    id: string;
    value: string;
};

type Statistika = {
    cpuPercent: string;
    memoryPercent: string;
    memoryUsage: string;
    netIO: string;
};

type Link = {
    service: string;
    path: string;
    port: number;
    protocol: string;
    startUri: string | null;
}

type Deistviye = {
    id: string;
    name: string;
    variables: {
        id: string;
        label: string;
        type: string,
        defaultValue: string,
        options: Record<string, unknown>
    }[],
    commands: string[]
}

export type ApiTipZadachi = "SBORKA" | "OBNOVLENIE" | "PODGOTOVKA" | "ZAPUSK" | "OSTANOVKA" | "SBROS_PODGOTOVKI" | "UDALENIE" | "DEISTVIE";
export type ApiStatusZadachi = "NEW" | "PENDING" | "CANCLED" | "SUCCESS" | "ERROR";
export type ApiTipProzesa = "SBORKA" | "OBNOVLENIE" | "PODGOTOVKA" | "ZAPUSK" | "OSTANOVKA" | "SBROS_PODGOTOVKI" | "UDALENIE" | "DEISTVIE";
export type ApiStatusProzesa = "NEW" | "ZADACHI_DOBAVLENI" | "PENDING" | "CANCLED" | "SUCCESS" | "ERROR";

export type ApiZadachaUnita = {
    jobId: string;
    type: ApiTipZadachi;
    state: ApiStatusZadachi;
}

export type ApiProzesUnita = {
    id: string;
    userId: string;
    type: ApiTipProzesa;
    state: ApiStatusProzesa;
    jobs: ApiZadachaUnita[];
};

export default class ModelDlySpiskaUnitov {
    public id: string = "";
    public authorId: string = "";
    public authorName: string = "";
    public name: string = "";
    public projectId: string = "";
    public projectName: string = "";
    public branch: string = "";
    public prozesi: ApiProzesUnita[] = [];
    public commands: string[] = [];
    public error: boolean = false;
    public links: Link[] = [];
    public unixtimePoslednegoObnovleniyaUnita: number|null = null;
    public unixtimePoslednegoObnovleniyaVHranilishe: number|null = null;
    public peremenie: Peremenaya[] = [];
    public unitSozdanSystemoi: boolean = false;
    public statistikaKonteinera: Statistika | null = null;
    public deistviya: Deistviye[] = [];
}

