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
// Primer-токены и сброс идут после quasar.scss, чтобы слой `.primer`
// перекрывал устаревшие правила каскадом, а не через !important.
import './styles/primer-tokens.scss'
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
        // Brand-цвета Quasar приведены к Primer-палитре (см.
        // src/styles/primer-tokens.scss): Notify, диалоги и старые страницы
        // должны выглядеть в одном ключе с Gh-компонентами.
        brand: {
            primary: "#0969da",
            secondary: "#57606a",
            accent: "#bf8700",
            positive: "#1a7f37",
            negative: "#cf222e",
            info: "#0969da",
            warning: "#9a6700",
            dark: "#0d1117"
        }
    }
})
app.mount('#app')



