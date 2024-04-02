export default class Unit {
    id: string = "";
    authorId: string = "";
    name: string = "";
    projectId: string = "";
    projectName: string = "";
    branch: string = "";
    state: string = "";
    waitResultFromRunner: boolean = false;
    commands: string[] = [];
    url: string | null = null;

    constructor(
        data: {
            id: string,
            authorId: string,
            name: string,
            projectId: string,
            projectName: string,
            branch: string,
            state: string,
            waitResultFromRunner: boolean,
            commands: string[],
            url: string | null,
        }
    ) {
        this.id = data.id;
        this.authorId = data.authorId;
        this.name = data.name;
        this.projectId = data.projectId;
        this.projectName = data.projectName;
        this.branch = data.branch;
        this.state = data.state;
        this.waitResultFromRunner = data.waitResultFromRunner;
        this.commands = data.commands;

        this.url = data.url;
    }
};
