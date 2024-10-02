type UserData = {
    id: string;
    email: string;
    roles: string[];
    locale: "en" | "ru";
}

export type LoginResponse = {
    token: string;
    expired: string | null;
    user: UserData
}
