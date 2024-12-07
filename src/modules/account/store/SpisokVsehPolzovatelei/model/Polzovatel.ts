export default class Polzovatel {
    id: string;
    email: string;
    isBlocked: boolean;
    nickname: string | null;
    constructor(
        data: {
            id: string,
            email: string,
            isBlocked: boolean,
            nickname: string | null
        }
    ) {
        this.id = data.id;
        this.email = data.email;
        this.isBlocked = data.isBlocked;
        this.nickname = data.nickname;
    }
}
