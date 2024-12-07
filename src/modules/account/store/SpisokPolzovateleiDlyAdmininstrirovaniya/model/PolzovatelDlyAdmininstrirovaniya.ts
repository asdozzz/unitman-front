export default class PolzovatelDlyAdmininstrirovaniya {
    id: string;
    email: string;
    isBlocked: boolean;
    roles: string;
    password: string;
    nickname: string | null;

    constructor(
        data: {
            id: string,
            email: string,
            isBlocked: boolean,
            roles: string;
            password: string;
            nickname: string | null;
        }
    ) {
        this.id = data.id;
        this.email = data.email;
        this.isBlocked = data.isBlocked;
        this.roles = data.roles;
        this.password = data.password;
        this.nickname = data.nickname;
    }
}
