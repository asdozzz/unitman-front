type Peremenaya = {
    id: string;
    value: string;
};

export default class ModelDlySpiskaUnitov {
    public id: string = "";
    public authorId: string = "";
    public authorName: string = "";
    public name: string = "";
    public projectId: string = "";
    public projectName: string = "";
    public branch: string = "";
    public state: string = "";
    public waitResultFromRunner: boolean = false;
    public commands: string[] = [];
    public error: boolean = false;
    public links: string[] = [];
    public jdemObnovlenieKodaPosleZapuska: boolean = false;
    public jdemUdaleniyaPosleZapuska: boolean = false;
    public unixtimePoslednegoObnovleniyaUnita: number|null = null;
    public unixtimePoslednegoObnovleniyaVHranilishe: number|null = null;
    public peremenie: Peremenaya[] = [];
}

