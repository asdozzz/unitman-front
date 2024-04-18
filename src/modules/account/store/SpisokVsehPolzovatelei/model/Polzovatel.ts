export default class Polzovatel {
    id: string;
    email: string;
    isBlocked: boolean;

    constructor(
        data: {
            id: string,
            email: string,
            isBlocked: boolean,
        }
    ) {
        this.id = data.id;
        this.email = data.email;
        this.isBlocked = data.isBlocked;
    }
}
