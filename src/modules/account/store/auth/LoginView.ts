class LoginForm {
    login: string|null;
    pass: string|null;

    constructor() {
        this.login = null;
        this.pass = null;
    }
}


export default class LoginView {
    form :LoginForm = new LoginForm()
}
