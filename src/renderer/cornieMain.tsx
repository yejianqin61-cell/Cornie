import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/tokens.css'

import CorniePet from './CorniePet'

// 桌宠小窗入口（cornie.html）：透明无边框窗口。
// 刻意不包 MantineProvider（盘点规格 05 的硬性要求）：桌宠全部 UI 为纯手写 DOM +
// --pet-* token（tokens.css），不使用任何 Mantine 组件——Mantine 的组件默认底色 /
// Portal 挂载链会威胁透明窗口的视觉契约。
createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <CorniePet />
  </StrictMode>
)
