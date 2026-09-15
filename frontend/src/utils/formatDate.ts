export interface FormattedEventTime {
  dateKey: string
  time: string
  display: string
}

export function parseDate(value?: string | Date | null): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * 将后端时间（如 2026-09-14T00:47:29.945902Z）格式化为分组日期和展示时刻
 */
export function formatEventTime(
  value?: string | Date | null,
  locale?: string,
): FormattedEventTime {
  const date = parseDate(value)
  if (!date) {
    return { dateKey: '', time: '', display: '' }
  }

  const dateKey = new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
  }).format(date)

  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

  return {
    dateKey,
    time,
    display: `${dateKey} ${time}`.trim(),
  }
}
