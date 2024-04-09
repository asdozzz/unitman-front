type ShagZadachiRunnera = {
    command: string;
    response: string;
    success: boolean;
    unixtime: number;
}

export type OtvetNaPoluchenieZadachRunneraUnita = {
    id: string;
    unitId: string;
    jobType: string;
    success: boolean;
    steps: ShagZadachiRunnera[]
}

