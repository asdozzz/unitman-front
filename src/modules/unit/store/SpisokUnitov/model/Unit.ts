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
    }
};
