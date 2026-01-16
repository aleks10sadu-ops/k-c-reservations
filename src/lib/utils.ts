import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | undefined | null) {
  if (amount === undefined || amount === null) return '0 ₽'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date | undefined | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('ru-RU')
}

export function formatTime(time: string | undefined | null) {
  if (!time) return ''
  return time.slice(0, 5)
}

export function calculatePlates(guests: number) {
  // Logic for plates calculation based on guests (placeholder logic)
  return Math.ceil(guests / 4)
}

export function calculateTotalWeight(weight: number, guests: number) {
  return (weight * guests)
}

export function formatPhone(phone: string | undefined | null) {
  if (!phone) return ''
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  // Format as Russian phone number
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`
  }
  return phone
}
