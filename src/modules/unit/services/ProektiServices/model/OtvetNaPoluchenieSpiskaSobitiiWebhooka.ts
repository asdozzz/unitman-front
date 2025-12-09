type SobitieWebhooka = {
    id: string;
    type: string;
    payload: string,
    response: string | null;
    unixtime: number;
    sent: boolean;
};

export type OtvetNaPoluchenieSpiskaSobitiiWebhooka = {
    list: SobitieWebhooka[];
    totalRecords: number;
};
