export default class PolzovatelProekta {
    projectId: string = "";
    userId: string = "";
    role: string = "";

    constructor(
        data: {
            projectId: string,
            userId: string,
            role: string,
        }
    ) {
        this.projectId = data.projectId;
        this.userId = data.userId;
        this.role = data.role;
    }
};
