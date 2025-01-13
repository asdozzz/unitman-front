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

type CollectionOptions = {
    options?: {
        id: string,
        name: string
    }[]
}

export type KonfigPeremenoi = {
    id: string,
    label: string,
    type: string,
    defaultValue: string,
    options: CollectionOptions
}

export type Deistviye = {
    id: string;
    name: string;
    variables: KonfigPeremenoi[],
    commands: string[]
}

export default class Unit {
    id: string = "";
    authorId: string = "";
    authorName: string = "";
    name: string = "";
    projectId: string = "";
    projectName: string = "";
    branch: string = "";
    state: string = "";
    waitResultFromRunner: boolean = false;
    commands: string[] = [];
    error: boolean = false;
    links: Link[] = []
    jdemObnovlenieKodaPosleZapuska: boolean = false;
    jdemAvtosborki: boolean = false;
    jdemUdaleniyaPosleZapuska: boolean = false;
    unixtimePoslednegoObnovleniyaUnita: number|null = null;
    unixtimePoslednegoObnovleniyaVHranilishe: number|null = null;
    peremenie: Peremenaya[] = [];
    unitSozdanSystemoi: boolean = false;
    statistikaKonteinera: Statistika | null;
    deistviya: Deistviye[] = [];

    constructor(
        data: {
            id: string,
            authorId: string,
            authorName: string,
            name: string,
            projectId: string,
            projectName: string,
            branch: string,
            state: string,
            waitResultFromRunner: boolean,
            commands: string[],
            error: boolean,
            links: Link[],
            jdemObnovlenieKodaPosleZapuska: boolean,
            jdemAvtosborki: boolean,
            jdemUdaleniyaPosleZapuska: boolean,
            unixtimePoslednegoObnovleniyaUnita: number|null,
            unixtimePoslednegoObnovleniyaVHranilishe: number|null,
            peremenie: Peremenaya[],
            unitSozdanSystemoi: boolean,
            statistikaKonteinera: Statistika | null,
            deistviya: Deistviye[] | null,
        }
    ) {
        this.id = data.id;
        this.authorId = data.authorId;
        this.authorName = data.authorName;
        this.name = data.name;
        this.projectId = data.projectId;
        this.projectName = data.projectName;
        this.branch = data.branch;
        this.state = data.state;
        this.waitResultFromRunner = data.waitResultFromRunner;
        this.commands = data.commands;

        this.links = data.links;
        this.error = data.error;
        this.jdemObnovlenieKodaPosleZapuska = data.jdemObnovlenieKodaPosleZapuska;
        this.jdemUdaleniyaPosleZapuska = data.jdemUdaleniyaPosleZapuska;
        this.jdemAvtosborki = data.jdemAvtosborki;
        this.unixtimePoslednegoObnovleniyaUnita = data.unixtimePoslednegoObnovleniyaUnita;
        this.unixtimePoslednegoObnovleniyaVHranilishe = data.unixtimePoslednegoObnovleniyaVHranilishe;
        this.peremenie = data.peremenie;
        this.unitSozdanSystemoi = data.unitSozdanSystemoi;
        this.statistikaKonteinera = data.statistikaKonteinera;
        this.deistviya = data.deistviya || [];
    }
};
