export default class Hranilishe {
    id: string = "";
    type: string = "";
    name: string = "";
    repoUrl: string = "";
    token: string = "";
    confirmed: boolean = false;

    constructor(
        data: {
            id: string,
            type: string,
            name: string,
            repoUrl: string,
            token: string,
            confirmed: boolean
        }
    ) {
        this.id = data.id;
        this.type = data.type;
        this.name = data.name;
        this.repoUrl = data.repoUrl;
        this.token = data.token;
        this.confirmed = data.confirmed;
    }
};
