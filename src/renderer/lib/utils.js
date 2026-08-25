import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** cn：条件类名合并（clsx + tailwind-merge），供 ui/* 基座组件使用。 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
