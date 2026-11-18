import { createApp } from 'vue'

import './style.css'
import App from './App.vue'
import router from "./bootstrap/router";
import i18n from "./bootstrap/translator";
import {createPinia} from "pinia";
import { Quasar, Dialog, Notify } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
// Подключается после CSS Quasar: переопределения темы должны быть позже.
import './styles/quasar.scss'
import { loadAppSettings } from './utils/appSettings'

const appSettings = loadAppSettings();
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
        // Тема применяется до монтирования, чтобы не было вспышки светлого фона.
        dark: appSettings.darkMode,
        // Значения дублируют src/styles/_tokens.scss: brand задаёт стартовые
        // CSS-переменные Quasar, а токены переопределяют их для обеих тем.
        brand: {
            primary: "#2f6fb0",
            secondary: "#5b6773",
            accent: "#e89a2b",
            positive: "#3e9e5b",
            negative: "#c4485a",
            info: "#3f8fbf",
            warning: "#d89020",
            dark: "#1f2933"
        }
    }
})
app.mount('#app')



