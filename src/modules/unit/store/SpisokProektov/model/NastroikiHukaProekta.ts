export default class NastroikiHukaProekta {
    avtosozdanie: boolean;
    avtoobnovlenie: boolean;
    avtoudalenie: boolean;
    obnovlenieBezSbrosaPodgotovki: boolean;

    constructor(
        data: {
            avtosozdanie: boolean,
            avtoobnovlenie: boolean,
            avtoudalenie: boolean,
            obnovlenieBezSbrosaPodgotovki: boolean,
        }
    ) {
        this.avtosozdanie = data.avtosozdanie;
        this.avtoobnovlenie = data.avtoobnovlenie;
        this.avtoudalenie = data.avtoudalenie;
        this.obnovlenieBezSbrosaPodgotovki = data.obnovlenieBezSbrosaPodgotovki;
    }
}
