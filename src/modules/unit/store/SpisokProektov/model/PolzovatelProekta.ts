export default class PolzovatelProekta {
    userId: string = "";
    role: string = "";

    constructor(
        data: {
            userId: string,
            role: string,
        }
    ) {
        this.userId = data.userId;
        this.role = data.role;
    }
};
