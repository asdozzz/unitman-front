type PolzovatelProekta = {
    userId: string;
    role: string;
}

type PeremenayaProekta = {
    tip: string;
    code: string;
    value: string;
}

export default class ModelDlySpiskaProektov {
    public id: string = "";
    public repoId: string = "";
    public code: string = "";
    public name: string = "";
    public mainBranch: string = "";
    public isActive: boolean = false;
    public state: string = "";
    public buildInfo: string | null = null;
    public removeInfo: string | null = null;
    public proxyHost: string = "";
    public users: PolzovatelProekta[] = [];
    public variables: PeremenayaProekta[] = [];
}
