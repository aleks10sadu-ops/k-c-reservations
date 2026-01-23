"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Hall,
  Menu,
  MenuItem,
  Guest,
  Reservation,
  Payment,
  Table,
  LayoutItem,
  CustomMenuItemType,
  MainMenuCategory,
  MainMenuItem,
  MainMenuItemVariant,
  StaffRole,
  StaffMember,
  StaffShift,
  HealthBook,
  HallLayoutTemplate,
  HallDateLayout,
  ReservationSetting
} from '@/types'

// Global Event for cross-hook synchronization
const DATA_CHANGE_EVENT = 'supabase-data-change'

export function notifyDataChange(tableName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT, { detail: { tableName } }))
  }
}

// Generic hook for fetching data
export function useSupabaseQuery<T>(
  tableName: string | string[],
  selectQuery: string = '*',
  filters?: any,
  orderBy?: { column: string; ascending?: boolean },
  skip: boolean = false
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState<string | null>(null)

  const tableNames = useMemo(() =>
    Array.isArray(tableName) ? tableName : [tableName],
    [JSON.stringify(tableName)]
  )
  const primaryTable = tableNames[0]
  const memoizedTableName = JSON.stringify(tableName)

  // Use stringified deps for the callback to prevent recreation on new object literals
  const filterStr = JSON.stringify(filters)
  const orderStr = JSON.stringify(orderBy)

  const fetchData = useCallback(async (signal?: AbortSignal, silent: boolean = false) => {
    // Пропускаем запрос если skip=true
    if (skip) {
      setData([])
      setLoading(false)
      return
    }

    if (!silent) {
      setLoading(true)
    }
    setError(null)

    try {
      const supabase = createClient()
      let query = supabase.from(primaryTable).select(selectQuery)

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
      }

      if (signal) {
        query = query.abortSignal(signal)
      }

      const { data: result, error: queryError } = await query
      if (queryError) {
        throw queryError
      }

      setData((result || []) as T[])
    } catch (err: any) {
      // Ignore abort errors
      const isAbort =
        (signal && signal.aborted) ||
        err.name === 'AbortError' ||
        err.message?.includes('AbortError') ||
        err.details?.includes('AbortError')

      if (isAbort) {
        return
      }

      setError(err.message)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [primaryTable, selectQuery, filterStr, orderStr, skip])

  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedFetch = useCallback(() => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
    fetchTimerRef.current = setTimeout(() => {
      fetchData()
    }, 50) // Small debounce to batch multiple relevant changes
  }, [fetchData])

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)

    return () => {
      controller.abort()
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
    }
  }, [fetchData])

  // Subscribe to realtime changes
  useEffect(() => {
    if (skip) return

    const supabase = createClient()
    const channel = supabase.channel(`${primaryTable}_multi_changes`)

    tableNames.forEach((table: string) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => debouncedFetch()
      )
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [memoizedTableName, fetchData, skip, primaryTable])

  // Subscribe to global data change events (manual triggers)
  useEffect(() => {
    const handleGlobalChange = (event: any) => {
      const changedTable = event.detail?.tableName
      if (changedTable === '*' || tableNames.includes(changedTable)) {
        debouncedFetch()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(DATA_CHANGE_EVENT, handleGlobalChange)
      return () => window.removeEventListener(DATA_CHANGE_EVENT, handleGlobalChange)
    }
  }, [memoizedTableName, fetchData])

  return {
    data,
    loading,
    error,
    refetch: (silent: boolean = false) => fetchData(undefined, silent)
  }
}

// ==================== HALLS ====================

export function useHalls() {
  return useSupabaseQuery<Hall>(
    ['halls', 'tables'],
    '*, tables (*)',
    undefined,
    { column: 'name' }
  )
}

export function useTables(hallId?: string | null, loadAll?: boolean) {
  // Если hallId не задан или пустой, и не требуется загрузка всех - 
  // используем skip чтобы не делать запрос вообще
  const shouldSkip = !loadAll && (!hallId || hallId.length === 0)
  const filters = loadAll
    ? undefined
    : (hallId && hallId.length > 0 ? { hall_id: hallId } : undefined)

  return useSupabaseQuery<Table>(
    'tables',
    '*',
    filters,
    { column: 'number' },
    shouldSkip  // Пропускаем запрос если нет hallId
  )
}

// ==================== LAYOUT ITEMS ====================

export function useLayoutItems(hall_id?: string) {
  return useSupabaseQuery<LayoutItem>(
    'layout_items',
    '*',
    hall_id ? { hall_id } : undefined,
    { column: 'created_at' }
  )
}

// ==================== HALL LAYOUTS & TEMPLATES ====================

export function useHallLayoutTemplates(hallId?: string) {
  return useSupabaseQuery<HallLayoutTemplate>(
    'hall_layout_templates',
    '*',
    hallId ? { hall_id: hallId } : undefined,
    { column: 'name' }
  )
}

export function useHallDateLayouts(hallId?: string, date?: string) {
  const filters: any = {}
  if (hallId) filters.hall_id = hallId
  if (date) filters.date = date

  return useSupabaseQuery<HallDateLayout>(
    'hall_date_layouts',
    '*',
    Object.keys(filters).length > 0 ? filters : undefined,
    { column: 'date' }
  )
}

// ==================== MENUS ====================

export function useMenus() {
  return useSupabaseQuery<Menu>(
    ['menus', 'menu_items'],
    '*, items:menu_items (*)',
    { is_active: true },
    { column: 'name' }
  )
}

export function useMenuItems(menuId?: string) {
  return useSupabaseQuery<MenuItem>(
    'menu_items',
    '*',
    menuId ? { menu_id: menuId } : undefined,
    { column: 'order_index' }
  )
}

export function useMenuItemTypes(menuId?: string) {
  return useSupabaseQuery<CustomMenuItemType>(
    'menu_item_types',
    '*',
    menuId ? { menu_id: menuId } : undefined,
    { column: 'order_index' }
  )
}

// ==================== MAIN MENU ====================

export function useMainMenuCategories() {
  return useSupabaseQuery<MainMenuCategory>(
    'main_menu_categories',
    '*',
    undefined,
    { column: 'order_index' }
  )
}

export function useMainMenuItems(categoryId?: string) {
  return useSupabaseQuery<MainMenuItem>(
    'main_menu_items',
    '*, variants:main_menu_item_variants(*)',
    categoryId ? { category_id: categoryId } : undefined,
    { column: 'order_index' }
  )
}

export function useMainMenuItemVariants(itemId?: string) {
  return useSupabaseQuery<MainMenuItemVariant>(
    'main_menu_item_variants',
    '*',
    itemId ? { item_id: itemId } : undefined,
    { column: 'order_index' }
  )
}

// ==================== GUESTS ====================

export function useGuests() {
  return useSupabaseQuery<Guest>(
    'guests',
    '*',
    undefined,
    { column: 'last_name' }
  )
}

// ==================== RESERVATIONS ====================

export function useReservations(filters?: {
  date?: string
  startDate?: string
  endDate?: string
  status?: string
  hall_id?: string
  guest_id?: string
}) {
  const [data, setData] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true)
    }
    setError(null)

    try {
      const supabase = createClient()
      let query = supabase
        .from('reservations')
        .select(`
          *,
          hall:halls (*),
          table:tables (*),
          reservation_tables:reservation_tables (
            table_id,
            table:tables (*)
          ),
          guest:guests (*),
          menu:menus (*),
          payments (*),
          selected_menu_items:reservation_menu_items (
            id,
            menu_item_id,
            is_selected,
            name,
            weight_per_person,
            price,
            type,
            order_index,
            menu_item:menu_items (*)
          ),
            main_menu_items:reservation_main_menu_items (
            *,
            main_menu_item:main_menu_items (
              *,
              category:main_menu_categories (name)
            ),
            variant:main_menu_item_variants (*)
          )
        `)

      if (filters?.date) {
        query = query.eq('date', filters.date)
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.hall_id) {
        query = query.eq('hall_id', filters.hall_id)
      }
      if (filters?.guest_id) {
        query = query.eq('guest_id', filters.guest_id)
      }

      const { data: result, error: queryError } = await query
        .order('date')
        .order('time')

      if (queryError) {
        throw queryError
      }

      const normalized = (result || []).map((row: any) => {
        const tables = (row.reservation_tables || [])
          .map((rt: any) => rt.table)
          .filter(Boolean)
        const table_ids = (row.reservation_tables || [])
          .map((rt: any) => rt.table_id)
          .filter(Boolean)
        const selected_menu_items = (row.selected_menu_items || [])
          .map((rmi: any) => ({
            id: rmi.id,
            reservation_id: row.id,
            menu_item_id: rmi.menu_item_id,
            is_selected: rmi.is_selected,
            name: rmi.name,
            weight_per_person: rmi.weight_per_person,
            price: rmi.price,
            type: rmi.type,
            order_index: rmi.order_index,
            menu_item: rmi.menu_item
          }))
          .filter(Boolean)

        // Calculate prepaid amount from payments array
        const prepaid_amount = Array.isArray(row.payments)
          ? row.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
          : Number(row.prepaid_amount) || 0

        const main_menu_items = (row.main_menu_items || []).map((item: any) => {
          const main_menu_item = item.main_menu_item ? {
            ...item.main_menu_item,
            category_name: item.main_menu_item.category?.name
          } : undefined;

          return {
            ...item,
            main_menu_item,
            variant: item.variant
          };
        })

        return { ...row, tables, table_ids, selected_menu_items, main_menu_items, prepaid_amount }
      })
      setData(normalized as Reservation[])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Subscribe to changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('reservations_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservation_tables' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservation_menu_items' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservation_main_menu_items' },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  // Subscribe to global data change events (manual triggers)
  useEffect(() => {
    const handleGlobalChange = (event: any) => {
      const relevantTables = ['reservations', 'payments', 'reservation_tables', 'reservation_menu_items', 'reservation_main_menu_items']
      if (event.detail?.tableName === '*' || relevantTables.includes(event.detail?.tableName)) {
        fetchData()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(DATA_CHANGE_EVENT, handleGlobalChange)
      return () => window.removeEventListener(DATA_CHANGE_EVENT, handleGlobalChange)
    }
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: (silent: boolean = false) => fetchData(silent)
  }
}

export async function searchReservations(query: string) {
  const supabase = createClient()
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  try {
    // 1. First, find guests that match the query
    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id')
      .or(`last_name.ilike.%${trimmedQuery}%,first_name.ilike.%${trimmedQuery}%,phone.ilike.%${trimmedQuery}%`)

    if (guestError) throw guestError
    const guestIds = guests?.map(g => g.id) || []

    // 2. Then search reservations matching comments OR the found guest IDs
    let queryBuilder = supabase
      .from('reservations')
      .select(`
        *,
        hall:halls (*),
        table:tables (*),
        guest:guests (*),
        payments (*),
        main_menu_items:reservation_main_menu_items (
          *,
          main_menu_item:main_menu_items (
            *,
            category:main_menu_categories (name)
          ),
          variant:main_menu_item_variants (*)
        )
      `)

    if (guestIds.length > 0) {
      queryBuilder = queryBuilder.or(`comments.ilike.%${trimmedQuery}%,guest_id.in.(${guestIds.join(',')})`)
    } else {
      queryBuilder = queryBuilder.ilike('comments', `%${trimmedQuery}%`)
    }

    const { data, error } = await queryBuilder
      .order('date', { ascending: false })
      .limit(50)

    if (error) throw error

    return (data || []).map((row: any) => {
      const prepaid_amount = Array.isArray(row.payments)
        ? row.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
        : Number(row.prepaid_amount) || 0

      const main_menu_items = (row.main_menu_items || []).map((item: any) => {
        const main_menu_item = item.main_menu_item ? {
          ...item.main_menu_item,
          category_name: item.main_menu_item.category?.name
        } : undefined;

        return {
          ...item,
          main_menu_item,
          variant: item.variant
        };
      })

      return { ...row, main_menu_items, prepaid_amount }
    })
  } catch (err) {
    return []
  }
}

export function useReservationSearch() {
  const [data, setData] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const search = async (query: string) => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setHasSearched(true)
    try {
      const results = await searchReservations(query)
      setData(results as Reservation[])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    setData([])
    setHasSearched(false)
  }

  return { data, loading, error, search, clear, hasSearched }
}


// ==================== PAYMENTS ====================

export function usePayments(reservationId?: string) {
  return useSupabaseQuery<Payment>(
    'payments',
    '*',
    reservationId ? { reservation_id: reservationId } : undefined,
    { column: 'payment_date', ascending: false }
  )
}

// ==================== STAFF ====================

export function useStaffRoles() {
  return useSupabaseQuery<StaffRole>(
    'staff_roles',
    '*',
    undefined,
    { column: 'name' }
  )
}

export function useStaff(roleId?: string) {
  return useSupabaseQuery<StaffMember>(
    ['staff', 'staff_roles'],
    '*, role:staff_roles (*)',
    roleId ? { role_id: roleId } : undefined,
    { column: 'name' }
  )
}

export function useStaffShifts(filters?: {
  staff_id?: string
  startDate?: string
  endDate?: string
}) {
  const [data, setData] = useState<StaffShift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true)
    }
    setError(null)

    try {
      const supabase = createClient()
      let query = supabase.from('staff_shifts').select('*')

      if (filters?.staff_id) {
        query = query.eq('staff_id', filters.staff_id)
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate)
      }

      const { data: result, error: queryError } = await query.order('date')

      if (queryError) throw queryError
      setData(result as StaffShift[])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Subscribe to changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('staff_shifts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_shifts' },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  // Subscribe to global data change events (manual triggers)
  useEffect(() => {
    const handleGlobalChange = (event: any) => {
      if (event.detail?.tableName === 'staff_shifts' || event.detail?.tableName === '*') {
        fetchData()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(DATA_CHANGE_EVENT, handleGlobalChange)
      return () => window.removeEventListener(DATA_CHANGE_EVENT, handleGlobalChange)
    }
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: (silent: boolean = false) => fetchData(silent)
  }
}

export function useHealthBooks() {
  return useSupabaseQuery<HealthBook>(
    'health_books',
    '*, staff:staff (*)',
    undefined,
    { column: 'expires_at' }
  )
}

// ==================== SETTINGS ====================

export function useReservationSettings() {
  return useSupabaseQuery<ReservationSetting>(
    'reservation_settings',
    '*',
    undefined,
    { column: 'key' }
  )
}

// ==================== MUTATIONS ====================

export function useCreateMutation<T>(tableName: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (data: Partial<T>): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data: result, error: mutationError } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single()

      if (mutationError) {
        setError(mutationError.message || `Не удалось создать запись в ${tableName}`)
        throw mutationError
      }

      notifyDataChange(tableName)
      return result
    } catch (err: any) {
      // LOG FULL ERROR DETAILS
      console.error(`ERROR INSERTING INTO ${tableName}:`, err)
      if (err?.code) console.error('Error Code:', err.code)
      if (err?.details) console.error('Error Details:', err.details)
      if (err?.hint) console.error('Error Hint:', err.hint)
      if (err?.message) console.error('Error Message:', err.message)

      const errorMessage = err?.message || err?.error?.message || `Не удалось создать запись в ${tableName}`
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

export function useUpdateMutation<T>(tableName: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (id: string, data: Partial<T>): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data: result, error: mutationError } = await supabase
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (mutationError) {
        console.error(`[useUpdateMutation] Error updating ${tableName}:`, JSON.stringify(mutationError, null, 2))
        throw mutationError
      }

      // Логируем для menu_items
      if (tableName === 'menu_items') {
        console.log(`[useUpdateMutation] Updated ${tableName}:`, result)
      }

      notifyDataChange(tableName)
      return result
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || 'Unknown error'
      setError(msg)
      console.error(`Error updating ${tableName}:`, err, JSON.stringify(err, null, 2))
      return null
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

export function useUpsertMutation<T>(tableName: string, conflictColumns: string[]) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (data: Partial<T> | Partial<T>[]): Promise<T[] | null> => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: result, error: mutationError } = await supabase
        .from(tableName)
        .upsert(data, { onConflict: conflictColumns.join(',') })
        .select()

      if (mutationError) {
        throw mutationError
      }

      notifyDataChange(tableName)
      return result
    } catch (err: any) {
      setError(err.message || 'Ошибка при сохранении')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

export function useDeleteMutation(tableName: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: mutationError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (mutationError) throw mutationError
      notifyDataChange(tableName)
      return true
    } catch (err: any) {
      const errorMessage = err?.message || err?.error?.message || `Не удалось удалить запись из ${tableName}`
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

