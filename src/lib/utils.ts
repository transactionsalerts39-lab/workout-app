import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

type ClassValue = Parameters<typeof clsx>[0]

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

