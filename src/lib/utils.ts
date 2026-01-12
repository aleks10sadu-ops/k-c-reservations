import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function formatTime(time: string | Date | undefined): string {
  if (!time) return ''

  // Если время уже в формате HH:mm, возвращаем как есть
  if (typeof time === 'string' && time.match(/^\d{2}:\d{2}$/)) {
    return time
  }

  // Если время в формате HH:mm:ss, убираем секунды
  if (typeof time === 'string' && time.match(/^\d{2}:\d{2}:\d{2}$/)) {
    return time.substring(0, 5) // Возвращаем только HH:mm
  }

  // Если время в формате с датой или timestamp, извлекаем время
  if (typeof time === 'string' && time.includes('T')) {
    try {
      const date = new Date(time)
      if (!Number.isNaN(date.getTime())) {
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
      }
    } catch {
      // Игнорируем ошибку и продолжаем
    }
  }

  // Если это Date объект
  if (time instanceof Date && !Number.isNaN(time.getTime())) {
    const hours = String(time.getHours()).padStart(2, '0')
    const minutes = String(time.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Если ничего не подошло, возвращаем как есть
  return String(time)
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} (${cleaned.slice(3, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8, 10)}-${cleaned.slice(10)}`
  }
  if (cleaned.length === 10) {
    return `+38 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8)}`
  }
  return phone
}

export function calculatePlates(guests: number): number {
  return Math.ceil(guests / 6)
}

export function calculateTotalWeight(weightPerPerson: number, guests: number): number {
  return weightPerPerson * guests
}

