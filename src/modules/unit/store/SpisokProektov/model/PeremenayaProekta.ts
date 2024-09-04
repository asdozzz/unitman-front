export default class PeremenayaProekta {
    tip: string = "";
    code: string = "";
    value: string = "";

    constructor(
        data: {
            tip: string,
            code: string,
            value: string,
        }
    ) {
        this.tip = data.tip;
        this.code = data.code;
        this.value = data.value;
    }
}
