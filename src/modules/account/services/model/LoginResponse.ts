type UserData = {
    email: string;
    roles: string[]
}

export type LoginResponse = {
    token: string;
    expired: string | null;
    user: UserData
}
