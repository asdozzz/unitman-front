import { createApp } from 'vue'

import './style.css'
import App from './App.vue'
import router from "./bootstrap/router";
import i18n from "./bootstrap/translator";
import {createPinia} from "pinia";
import { Quasar, Dialog, Notify } from 'quasar'
import '@quasar/extras/roboto-font-latin-ext/roboto-font-latin-ext.css'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'

const pinia = createPinia();
const app = createApp(App);
app.use(i18n);
app.use(pinia)
app.use(router)
// `Dialog` регистрируется явно: Quasar не устанавливает его автоматически
// (в отличие от Platform/Body/Dark/Screen/History/Lang/IconSet), и без него
// `$q.dialog` не существует — подтверждение архивации сессии просто не
// открывалось, а обработчик клика падал на `undefined`.
app.use(Quasar, {
    plugins: {Dialog, Notify},
    config: {
        brand: {
            primary: "#4274a6",
            positive: "#409c55",
            negative: "#bd4654",
            dark: "#4d4d4d"
        }
    }
})
app.mount('#app')



