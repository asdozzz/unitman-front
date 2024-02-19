import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from "./bootstrap/router";
import {createPinia} from "pinia";
import { Quasar, Notify } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'

createApp(App).use(Quasar, {plugins: {Notify}}).use(createPinia()).use(router).mount('#app')

