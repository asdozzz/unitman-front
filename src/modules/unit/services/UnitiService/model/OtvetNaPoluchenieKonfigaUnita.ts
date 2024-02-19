export type OtvetNaPoluchenieKonfigaUnita = {
    variables: {
        id: string;
        label: string;
        type: string,
        defaultValue: string,
        options: Record<string, unknown>
    }[]
}
