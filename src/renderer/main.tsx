import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import { RouterProvider } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/schedule/styles.css'
import '@mantine/charts/styles.css'
import './styles/tokens.css'

import { theme, cssVariableResolver } from './theme/theme'
import { router } from './router'

dayjs.locale('zh-cn')

// 主窗口入口（index.html）。桌宠窗口入口见 cornieMain.tsx。
createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <MantineProvider theme={theme} cssVariablesResolver={cssVariableResolver} forceColorScheme="light">
      <Notifications position="top-right" limit={4} />
      <DatesProvider settings={{ firstDayOfWeek: 1 }}>
        <RouterProvider router={router} />
      </DatesProvider>
    </MantineProvider>
  </StrictMode>
)
