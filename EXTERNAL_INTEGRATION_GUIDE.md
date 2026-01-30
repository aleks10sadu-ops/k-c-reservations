# Руководство по интеграции для внешнего сайта (CRM Reservations)

В этом документе описано, как интегрировать проверку доступности залов и создание бронирований с учетом статуса "Лист ожидания" (Waitlist) и realtime-обновлений.

## 1. Подключение к Supabase

В вашем проекте (`lib/supabase/client.ts`) уже используется клиент. Убедитесь, что он инициализирован с URL и ключом нашей CRM.

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_CRM_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY!
  )
}
```

## 2. Проверка доступности (RPC `get_hall_month_availability`)

Мы добавили новую RPC функцию для получения статуса загруженности зала по дням.

### Типы (Typescript)

```typescript
export interface DailyAvailability {
  date: string;              // 'YYYY-MM-DD'
  total_capacity: number;
  reserved_count: number;
  remaining_capacity: number;
  is_full: boolean;          // true, если мест меньше, чем запрашиваемое кол-во гостей
}

export interface AvailabilityParams {
  hallId: string;
  startDate: string;         // 'YYYY-MM-DD'
  endDate: string;           // 'YYYY-MM-DD'
  guestsCount: number;
}
```

### Пример Hook (React)

Рекомендуем создать хук `useHallAvailability` для получения данных и подписки на обновления.

```typescript
// hooks/useHallAvailability.ts
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DailyAvailability } from '@/types' // ваши типы

export function useHallAvailability(hallId: string, monthDate: Date, guestsCount: number) {
  const [availability, setAvailability] = useState<Record<string, boolean>>({}) // { '2026-05-20': true (isFull) }
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAvailability = useCallback(async () => {
    // Вычисляем начало и конец месяца
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    
    // Форматируем даты в YYYY-MM-DD (учтите часовые пояса, если нужно)
    const startDate = start.toISOString().split('T')[0]
    const endDate = end.toISOString().split('T')[0]

    const { data, error } = await supabase.rpc('get_hall_month_availability', {
      p_hall_id: hallId,
      p_date_start: startDate,
      p_date_end: endDate,
      p_guests_count: guestsCount
    })

    if (error) {
      console.error('Error fetching availability:', error)
      return
    }

    // Преобразуем в удобный словарь: { DateString: isFull }
    const lookup: Record<string, boolean> = {}
    (data as DailyAvailability[]).forEach(day => {
      lookup[day.date] = day.is_full
    })
    
    setAvailability(lookup)
    setLoading(false)
  }, [hallId, monthDate, guestsCount])

  // 1. Initial Fetch
  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  // 2. Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`hall_availability_${hallId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'reservations',
          filter: `hall_id=eq.${hallId}` // Слушаем изменения только этого зала
        },
        () => {
          console.log('Realtime update: refreshing availability...')
          fetchAvailability() // Перезапрашиваем данные при любом изменении
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hallId, fetchAvailability])

  return { availability, loading }
}
```

## 3. Интеграция в Календарь (DateTimePicker)

В вашем компоненте `app/components/DateTimePicker.tsx`:

1.  Используйте хук `useHallAvailability`.
2.  Передайте `availability` в пропсы календаря.
3.  При рендеринге ячейки дня проверяйте `availability[dateString]`.
    *   Если `true` (занято) -> красьте ячейку в **желтый**.
    *   **Важно**: Не дизейблите (disable) этот день полностью, дайте пользователю нажать на него.

## 4. Логика создания брони (Waitlist)

Когда пользователь выбирает дату и нажимает "Забронировать":

1.  Проверьте `availability[selectedDate]`.
2.  **Если `is_full: true`**:
    *   Покажите Confirm Modal: *"К сожалению, на эту дату мест нет. Хотите встать в лист ожидания?"*.
    *   Если ДА -> вызывайте `create_public_reservation` с параметром `p_status: 'waitlist'`.
3.  **Если `is_full: false` (или undefined)**:
    *   Вызывайте `create_public_reservation` как обычно (или явно `p_status: 'new'`).

```typescript
// Пример вызова
const { data, error } = await supabase.rpc('create_public_reservation', {
  p_phone: phone,
  p_first_name: firstName,
  p_last_name: lastName,
  p_date: dateStr,
  p_time: timeStr,
  p_guests_count: guests,
  p_hall_id: hallId,
  p_status: isFull ? 'waitlist' : 'new', // <--- ВАЖНО
  p_comments: comments
})
```

## 5. Резюме

1.  **Backend**: Добавлена функция `get_hall_month_availability` и поддержка статуса `waitlist`.
2.  **Frontend**:
    *   Использовать `rpc('get_hall_month_availability')`.
    *   Подписаться на `reservations` через Realtime для авто-обновления.
    *   "Желтые" даты остаются кликабельными.
    *   При выборе "желтой" даты отправлять `p_status: 'waitlist'`.
