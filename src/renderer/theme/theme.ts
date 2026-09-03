import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core'

// ─────────────────────────────────────────────────────────────────────────────
// Cornie 全局设计 Token（单一事实源）
//
// 规则（全组件强制遵守，stylelint 门禁兜底）：
// 1. 一切色值只允许在本文件或 styles/tokens.css（桌宠专用）中定义；
//    业务组件引用方式二选一：Mantine style props（c="brand.5"、bg="var(--color-tint-chat)"）
//    或 CSS 变量 var(--color-*) / var(--pet-*），禁止裸 hex / 裸字号 / 裸间距。
// 2. 本文件沿用旧 T-02 token 体系的品牌取值与命名（--color-* / --spacing-* /
//    --radius-*），通过 CSSVariablesResolver 原名发射，保证语义零丢失。
// 3. spacing style props 约定：只用具名档（xs/sm/md/lg/xl）或显式字符串（'12px'），
//    禁止裸数字（Mantine 会按 --mantine-spacing-md 倍数展开，语义易错）。
// ─────────────────────────────────────────────────────────────────────────────

/** 品牌强调色 accent #e8856a（5 阶基准）与 hover #d96f53（6 阶） */
const brand: MantineColorsTuple = [
  '#fdf3ef',
  '#fbe4dc',
  '#f7c9ba',
  '#f2ab93',
  '#ee977c',
  '#e8856a',
  '#d96f53',
  '#c15a41',
  '#a34a35',
  '#83392a',
]

/** 危险色 danger #d96a5c（基准 5 阶） */
const dangerRed: MantineColorsTuple = [
  '#fdf2f0',
  '#fbe2df',
  '#f6c3bd',
  '#f0a298',
  '#ea8a7d',
  '#d96a5c',
  '#c65b4e',
  '#a94b3f',
  '#8b3d33',
  '#6d2f27',
]

/** 成功色 success #5b9a6b（基准 5 阶） */
const successGreen: MantineColorsTuple = [
  '#f0f6f1',
  '#ddece1',
  '#bcd9c5',
  '#9ac6a8',
  '#7db58f',
  '#5b9a6b',
  '#4c875c',
  '#3f724c',
  '#325d3d',
  '#25482e',
]

/** 警示色 warning #e4a35e（基准 5 阶） */
const warningAmber: MantineColorsTuple = [
  '#fdf6ec',
  '#fbe9d2',
  '#f6d3a2',
  '#f0bd70',
  '#e4a35e',
  '#c98c4c',
  '#ac773d',
  '#8d6232',
  '#6f4c28',
  '#52381e',
]

/** 文字主色 text #2d2a26（基准 8 阶，dark 系） */
const ink: MantineColorsTuple = [
  '#f6f4f2',
  '#e8e4df',
  '#cfC9c1'.toLowerCase(),
  '#b5aca1',
  '#998f83',
  '#6f665c',
  '#4a443d',
  '#2d2a26',
  '#211f1c',
  '#151412',
]

// ── 模块 tint（仅作背景，不注册为 Mantine 色板，经 CSS 变量发射） ──
export const TINT = {
  chat: '#fff4f0',
  diary: '#fff0f3',
  ledger: '#f0f5f0',
  todo: '#fff7ef',
  schedule: '#fff7ef',
  memory: '#eff4f9',
} as const

// ── 语义软底色 ──
export const SOFT = {
  success: '#eef6f0',
  warning: '#fff7ea',
  danger: '#fbedea',
  info: '#f5f8fb',
} as const

// ── 图表辅助色 ──
export const CHART = {
  sage: '#8db5a7',
  sand: '#c59e7a',
} as const

// ── 基底 ──
export const BASE = {
  bg: '#faf8f5',
  surface: '#ffffff',
  surface2: '#f5f2ee',
  text: '#2d2a26',
  muted: '#9a948c',
  border: 'rgba(0, 0, 0, 0.08)',
} as const

export const FONT_FAMILY =
  "'Microsoft YaHei', 'PingFang SC', 'Segoe UI', ui-sans-serif, system-ui, -apple-system, Roboto, Arial"

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 5,
  defaultRadius: 'md',
  colors: {
    brand,
    danger: dangerRed,
    success: successGreen,
    warning: warningAmber,
    ink,
  },
  white: '#ffffff',
  black: '#2d2a26',
  fontFamily: FONT_FAMILY,
  fontFamilyMonospace: "'Cascadia Code', 'JetBrains Mono', Consolas, 'Courier New', ui-monospace, monospace",
  fontSizes: {
    xs: '11px',
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '18px',
  },
  lineHeights: {
    xs: '1.5',
    sm: '1.5',
    md: '1.6',
    lg: '1.5',
    xl: '1.4',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '20px',
    xl: '24px',
  },
  radius: {
    xs: '6px',
    sm: '10px',
    md: '14px',
    lg: '16px',
    xl: '20px',
  },
  shadows: {
    xs: '0 1px 4px rgba(45, 42, 38, 0.04)',
    sm: '0 2px 10px rgba(45, 42, 38, 0.05)',
    md: '0 2px 10px rgba(45, 42, 38, 0.05)',
    lg: '0 8px 24px rgba(45, 42, 38, 0.08)',
    xl: '0 8px 24px rgba(45, 42, 38, 0.08)',
  },
  headings: {
    fontWeight: '800',
    fontFamily: FONT_FAMILY,
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
        overlayProps: { opacity: 0.35, blur: 2 },
        centered: true,
      },
    },
    Drawer: {
      defaultProps: {
        overlayProps: { opacity: 0.35, blur: 2 },
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
        autosize: true,
        minRows: 3,
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
        variant: 'light',
      },
    },
    Tooltip: {
      defaultProps: {
        withArrow: true,
      },
    },
    Table: {
      defaultProps: {
        verticalSpacing: 'xs',
        highlightOnHover: true,
      },
    },
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// CSS Token 发射：把非 Mantine 体系的既有 token 以 CSS 变量形式原值保留，
// 命名空间与旧 tokens.css 完全一致（--color-* / --text-* / --spacing-* /
// --radius-* / --shadow-* / --duration-* / --ease-*），存量语义零丢失。
// 桌宠专属 --pet-* 在 styles/tokens.css 维护（两个窗口共用）。
// ─────────────────────────────────────────────────────────────────────────────
export const cssVariableResolver: CSSVariablesResolver = () => ({
  variables: {
    // ── 基底 ──
    '--color-bg': BASE.bg,
    '--color-surface': BASE.surface,
    '--color-surface-2': BASE.surface2,
    '--color-text': BASE.text,
    '--color-muted': BASE.muted,
    '--color-border': BASE.border,

    // ── 强调 / 语义 ──
    '--color-accent': brand[5],
    '--color-accent-hover': brand[6],
    '--color-danger': dangerRed[5],
    '--color-success': successGreen[5],
    '--color-success-soft': SOFT.success,
    '--color-warning': warningAmber[5],
    '--color-warning-soft': SOFT.warning,
    '--color-danger-soft': SOFT.danger,
    '--color-info-soft': SOFT.info,

    // ── 模块 tint ──
    '--color-tint-chat': TINT.chat,
    '--color-tint-diary': TINT.diary,
    '--color-tint-ledger': TINT.ledger,
    '--color-tint-todo': TINT.todo,
    '--color-tint-schedule': TINT.schedule,
    '--color-tint-memory': TINT.memory,

    // ── 图表辅助色 ──
    '--color-chart-sage': CHART.sage,
    '--color-chart-sand': CHART.sand,

    // ── 字号刻度（10 档，沿用旧刻度） ──
    '--text-xs': '11px',
    '--text-sm': '12px',
    '--text-base': '13px',
    '--text-md': '14px',
    '--text-lg': '16px',
    '--text-xl': '18px',
    '--text-2xl': '20px',
    '--text-3xl': '24px',
    '--text-4xl': '28px',
    '--text-5xl': '32px',

    // ── 间距刻度 ──
    '--spacing-1': '4px',
    '--spacing-2': '8px',
    '--spacing-3': '12px',
    '--spacing-4': '16px',
    '--spacing-5': '20px',
    '--spacing-6': '24px',
    '--spacing-8': '32px',

    // ── 圆角刻度（5 档） ──
    '--radius-sm': '10px',
    '--radius-md': '12px',
    '--radius-lg': '14px',
    '--radius-xl': '16px',
    '--radius-2xl': '20px',

    // ── 阴影 ──
    '--shadow-card': '0 2px 10px rgba(45, 42, 38, 0.05)',
    '--shadow-raised': '0 8px 24px rgba(45, 42, 38, 0.08)',

    // ── 动效 ──
    '--duration-fast': '160ms',
    '--duration-base': '220ms',
    '--duration-slow': '320ms',
    '--ease-standard': 'ease',
    '--ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)',

    // 便捷别名：组件可直接 var() 引用 Mantine 变量名以外的主流 token
    '--muted': BASE.muted,
  },
  light: {},
  dark: {},
})
