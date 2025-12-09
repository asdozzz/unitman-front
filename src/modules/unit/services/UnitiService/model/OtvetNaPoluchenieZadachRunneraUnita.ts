export type ApiTipZadachi = "SBORKA" | "OBNOVLENIE" | "PODGOTOVKA" | "ZAPUSK" | "OSTANOVKA" | "SBROS_PODGOTOVKI" | "UDALENIE" | "DEISTVIE";
export type ApiStatusZadachi = "NEW" | "PENDING" | "CANCLED" | "SUCCESS" | "ERROR";
export type ApiTipProzesa = "SBORKA" | "OBNOVLENIE" | "PODGOTOVKA" | "ZAPUSK" | "OSTANOVKA" | "SBROS_PODGOTOVKI" | "UDALENIE" | "DEISTVIE";
export type ApiStatusProzesa = "NEW" | "ZADACHI_DOBAVLENI" | "PENDING" | "CANCLED" | "SUCCESS" | "ERROR";

export type ApiZadachaUnita = {
    id: string;
    type: ApiTipZadachi;
    state: ApiStatusZadachi;
}

export type OtvetNaPoluchenieZadachRunneraUnita = {
    id: string;
    userId: string;
    type: ApiTipProzesa;
    state: ApiStatusProzesa;
    jobs: ApiZadachaUnita[];
}

