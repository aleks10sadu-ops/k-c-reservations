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
    const supabase = await createClient()
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        date: date,
        time: time,
        hall_id: defaultHallId,
        guest_id: guest.id,
        guests_count: parseInt(guests_count),
        children_count: 0,
        status: 'new',
        total_amount: 0,
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
