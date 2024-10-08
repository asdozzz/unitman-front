type ShagZadachiRunnera = {
    command: string;
    response: string;
    success: boolean;
    unixtime: number;
}

export type OtvetNaPoluchenieShagovZadachiRunnera = {
    id: string;
    steps: ShagZadachiRunnera[]
}
