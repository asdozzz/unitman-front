export type OtvetNaPolucheniePeremenihUnita = {
    konfig: {
        id: string;
        label: string;
        type: string,
        defaultValue: string,
        options: Record<string, unknown>
    },
    value: string
}
