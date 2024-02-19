export default class PolzovatelDlyAdmininstrirovaniya {
    id: string;
    email: string;
    isBlocked: boolean;
    roles: string;
    password: string;

    constructor(
        data: {
            id: string,
            email: string,
            isBlocked: boolean,
            roles: string;
            password: string;
        }
    ) {
        this.id = data.id;
        this.email = data.email;
        this.isBlocked = data.isBlocked;
        this.roles = data.roles;
        this.password = data.password;
    }
}
