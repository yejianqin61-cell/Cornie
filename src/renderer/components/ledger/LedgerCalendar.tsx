import { Month, type DayProps } from '@mantine/dates'
import { Box, Button, Group, Stack, Text } from '@mantine/core'

import { formatDate } from '../../utils/date'

// 记账月历（React 版 LedgerCalendar.vue）：
// 网格底座由 @mantine/dates Month 组件接管（旧版为手写 42 格），
// 周一起始（DatesProvider firstDayOfWeek=1）、今日/选中态、支出收入点标记经
// renderDay + getDateControlProps 注入，行为与旧版一致。
// 注：Mantine 9 的日期 API 以 'YYYY-MM-DD' 字符串传递。

export interface LedgerCalendarCell {
  date: string
  day: number
  inMonth: boolean
  expense: number
  income: number
}

export interface LedgerCalendarProps {
  month: Date
  cells: LedgerCalendarCell[]
  summaryByDay: Map<string, { expense: number; income: number }>
  selectedDate: string
  todayDate: string
  onPrevMonth: () => void
  onNextMonth: () => void
  onSelectDate: (date: string) => void
}

export default function LedgerCalendar({
  month,
  summaryByDay,
  selectedDate,
  todayDate,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
}: LedgerCalendarProps) {
  const renderDay: DayProps['renderDay'] = (date) => {
    const key = String(date)
    const summary = summaryByDay.get(key)
    const hasExpense = (summary?.expense || 0) > 0
    const hasIncome = (summary?.income || 0) > 0
    const isToday = key === todayDate
    return (
      <Stack gap={2} align="center" justify="center">
        <Text
          fz="var(--text-base)"
          lh={1}
          style={isToday ? { color: 'var(--color-success)', fontWeight: 700 } : undefined}
        >
          {Number(key.slice(8, 10))}
        </Text>
        {hasExpense || hasIncome ? (
          <Group gap={4} wrap="nowrap">
            {hasExpense ? <Box w={6} h={6} style={{ borderRadius: 999, background: 'var(--color-danger)' }} /> : null}
            {hasIncome ? <Box w={6} h={6} style={{ borderRadius: 999, background: 'var(--color-success)' }} /> : null}
          </Group>
        ) : null}
      </Stack>
    )
  }

  return (
    <Box p="14px 16px" style={{ background: 'var(--color-surface)' }} className="card">
      <Group justify="space-between" gap={10}>
        <Button variant="subtle" size="compact-sm" style={{ borderRadius: 999 }} onClick={onPrevMonth}>
          上个月
        </Button>
        <Text fz="var(--text-md)" fw={700} c="var(--color-text)">
          {`${month.getFullYear()}年${month.getMonth() + 1}月`}
        </Text>
        <Button variant="subtle" size="compact-sm" style={{ borderRadius: 999 }} onClick={onNextMonth}>
          下个月
        </Button>
      </Group>

      <Month
        mt={12}
        month={formatDate(month)}
        firstDayOfWeek={1}
        renderDay={renderDay}
        getDayProps={(date) => {
          const key = String(date)
          return {
            selected: key === selectedDate && key !== todayDate,
            onClick: () => onSelectDate(key),
          }
        }}
        styles={{
          day: {
            minHeight: 46,
            borderRadius: 'var(--radius-lg)',
          },
        }}
      />
    </Box>
  )
}
