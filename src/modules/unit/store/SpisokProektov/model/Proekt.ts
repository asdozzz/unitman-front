import PolzovatelProekta from "@/modules/unit/store/SpisokProektov/model/PolzovatelProekta";

export default class Proekt {
    id: string = "";
    repoId: string = "";
    name: string = "";
    code: string = "";
    mainBranch: string = "";
    state: string = "";
    isActive: boolean = false;
    buildInfo: string | null = null;
    removeInfo: string | null = null;
    proxyHost: string | null = null;
    users: PolzovatelProekta[] = [];

    constructor(
        data: {
            id: string,
            repoId: string,
            name: string,
            code: string,
            mainBranch: string,
            state: string,
            isActive: boolean,
            buildInfo: string|null,
            removeInfo: string|null,
            proxyHost: string|null,
            users: PolzovatelProekta[]
        }
    ) {
        this.id = data.id;
        this.repoId = data.repoId;
        this.name = data.name;
        this.code = data.code;
        this.mainBranch = data.mainBranch;
        this.isActive = data.isActive;
        this.buildInfo = data.buildInfo;
        this.removeInfo = data.removeInfo;
        this.state = data.state;
        this.proxyHost = data.proxyHost;
        this.users = data.users;
    }
};
