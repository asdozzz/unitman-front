export default class NastroikiHukaProekta {
    avtosozdanie: boolean;
    avtoobnovlenie: boolean;
    avtoudalenie: boolean;

    constructor(
        data: {
            avtosozdanie: boolean,
            avtoobnovlenie: boolean,
            avtoudalenie: boolean,
        }
    ) {
        this.avtosozdanie = data.avtosozdanie;
        this.avtoobnovlenie = data.avtoobnovlenie;
        this.avtoudalenie = data.avtoudalenie;
    }
}
