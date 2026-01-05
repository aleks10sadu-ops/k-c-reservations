import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findOrCreateGuestByPhone, getHalls } from '@/lib/supabase/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Валидация входных данных
    const { name, phone, date, time, guests_count, comments } = body

    if (!name || !phone || !date || !time || !guests_count) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля: name, phone, date, time, guests_count' },
        { status: 400 }
      )
    }

    // Получаем первый доступный зал (или можно передать hall_id в запросе)
    const halls = await getHalls()
    if (halls.length === 0) {
      return NextResponse.json(
        { error: 'Нет доступных залов' },
        { status: 500 }
      )
    }

    const defaultHallId = halls[0].id

    // Получаем первое доступное активное меню
    const supabase = await createClient()
    const { data: activeMenus, error: menusError } = await supabase
      .from('menus')
      .select('id, name, price_per_person')
      .eq('is_active', true)
      .order('name')
      .limit(1)

    if (menusError) {
      console.error('Error fetching active menus:', menusError)
      return NextResponse.json(
        { error: 'Ошибка при получении меню' },
        { status: 500 }
      )
    }

    const defaultMenu = activeMenus?.[0]
    const defaultMenuId = defaultMenu?.id
    const totalAmount = defaultMenu ? defaultMenu.price_per_person * parseInt(guests_count) : 0

    console.log('API: Active menus found:', activeMenus?.length || 0, 'Default menu:', defaultMenu?.name, 'ID:', defaultMenuId)

    // Находим или создаем гостя
    const nameParts = name.trim().split(' ').filter((part: string) => part.length > 0)
    const firstName = nameParts[0] || name
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined

    const guest = await findOrCreateGuestByPhone(phone, firstName, lastName)
    
    if (!guest) {
      return NextResponse.json(
        { error: 'Ошибка при создании/поиске гостя' },
        { status: 500 }
      )
    }

    // Создаем бронирование
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        date: date,
        time: time,
        hall_id: defaultHallId,
        guest_id: guest.id,
        guests_count: parseInt(guests_count),
        children_count: 0,
        menu_id: defaultMenuId,
        status: 'new',
        total_amount: totalAmount,
        comments: comments || null
      })
      .select(`
        *,
        hall:halls (*),
        guest:guests (*)
      `)
      .single()

    if (reservationError) {
      console.error('Error creating reservation:', reservationError)
      return NextResponse.json(
        { error: 'Ошибка при создании бронирования', details: reservationError.message },
        { status: 500 }
      )
    }

    console.log('API: Reservation created with menu_id:', reservation.menu_id, 'total_amount:', reservation.total_amount)

    // Создаем записи о выбранных позициях меню
    if (defaultMenuId) {
      // Получаем все позиции меню
      const { data: menuItems, error: menuItemsError } = await supabase
        .from('menu_items')
        .select('id, is_selectable')
        .eq('menu_id', defaultMenuId)

      if (!menuItemsError && menuItems) {
        // Создаем записи для неселективных позиций (они всегда включены)
        const nonSelectableItems = menuItems.filter(item => !item.is_selectable)
        if (nonSelectableItems.length > 0) {
          const reservationMenuItems = nonSelectableItems.map(item => ({
            reservation_id: reservation.id,
            menu_item_id: item.id,
            is_selected: true
          }))

          const { error: rmiError } = await supabase
            .from('reservation_menu_items')
            .insert(reservationMenuItems)

          if (rmiError) {
            console.error('Error creating reservation menu items:', rmiError)
            // Не прерываем процесс, просто логируем ошибку
          }
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        reservation: reservation,
        message: 'Бронирование успешно создано'
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error.message },
      { status: 500 }
    )
  }
}

// OPTIONS для CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
