import { format as formatTz, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { ru } from 'date-fns/locale';

export const TIMEZONE = 'Europe/Moscow';

// Get current time in Moscow
export function getNowInMoscow(): Date {
    return toZonedTime(new Date(), TIMEZONE);
}

// Format a date in Moscow timezone
export function formatInMoscow(date: Date | string | number, formatStr: string): string {
    if (!date) return '';
    const zonedDate = toZonedTime(date, TIMEZONE);
    return formatTz(zonedDate, formatStr, { locale: ru, timeZone: TIMEZONE });
}

// Create a Date object representing a specific time in Moscow
// This is useful when the user selects a date/time in the UI (which implies Moscow time)
// and we need to convert it to a UTC Date object for storage/API
export function parseFromMoscow(dateStr: string): Date {
    return fromZonedTime(dateStr, TIMEZONE);
}

export function toMoscowTime(date: Date | string | number): Date {
    return toZonedTime(date, TIMEZONE);
}

// Helper to format date for display (e.g. "19.01.2026")
export function formatDateRu(date: Date | string | number | undefined | null): string {
    if (!date) return '';
    return formatInMoscow(date, 'dd.MM.yyyy');
}

// Helper to format time for display (e.g. "15:20")
export function formatTimeRu(date: Date | string | number | undefined | null): string {
    if (!date) return '';
    // If usage passes full date string to formatTime, handle it
    if (typeof date === 'string' && date.includes('T')) {
        return formatInMoscow(date, 'HH:mm');
    }
    // If it's a date object
    if (date instanceof Date) {
        return formatInMoscow(date, 'HH:mm');
    }

    // If it's just a time string "18:00", return as is
    return String(date).slice(0, 5);
}

export function formatDateTimeRu(date: Date | string | number | undefined | null): string {
    if (!date) return '';
    return formatInMoscow(date, 'dd.MM.yyyy HH:mm');
}
