type Peremenaya = {
    id: string;
    value: string;
};

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
    links: string[] = []
    jdemObnovlenieKodaPosleZapuska: boolean = false;
    jdemAvtosborki: boolean = false;
    jdemUdaleniyaPosleZapuska: boolean = false;
    unixtimePoslednegoObnovleniyaUnita: number|null = null;
    unixtimePoslednegoObnovleniyaVHranilishe: number|null = null;
    peremenie: Peremenaya[] = [];

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
            links: string[],
            jdemObnovlenieKodaPosleZapuska: boolean,
            jdemAvtosborki: boolean,
            jdemUdaleniyaPosleZapuska: boolean,
            unixtimePoslednegoObnovleniyaUnita: number|null,
            unixtimePoslednegoObnovleniyaVHranilishe: number|null,
            peremenie: Peremenaya[]
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
    }
};
