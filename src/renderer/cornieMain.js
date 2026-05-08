import { createApp } from 'vue'
import CorniePet from './CorniePet.vue'
import './style.css'

// 小窗：保持透明背景
document.body.classList.add('transparent')

createApp(CorniePet).mount('#app')

