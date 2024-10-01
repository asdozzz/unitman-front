type UserData = {
    id: string;
    email: string;
    roles: string[];
    locale: string;
}

export type LoginResponse = {
    token: string;
    expired: string | null;
    user: UserData
}
