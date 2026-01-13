import { getReservationById, getMenuItemTypes } from '@/lib/supabase/api'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, formatTime, calculatePlates, calculateTotalWeight } from '@/lib/utils'
import { getMenuItemTypeLabel, MenuItemType, ReservationMenuItem } from '@/types'
import { Clock, Users, MapPin, Phone, User, ChefHat, CreditCard, MessageSquare } from 'lucide-react'
import { PrintAutoStart } from './PrintAutoStart'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function PrintReservationPage({ params }: PageProps) {
    const { id } = await params
    const reservation = await getReservationById(id)

    if (!reservation) {
        notFound()
    }

    const customTypes = reservation.menu_id ? await getMenuItemTypes(reservation.menu_id) : []

    // Группировка позиций меню по типу с дедупликацией по названию и весу
    const menuItemsByType: Record<string, ReservationMenuItem[]> = {}
    const seenItems = new Set<string>()

    reservation.selected_menu_items?.forEach(item => {
        // Показываем только выбранные позиции
        if (!item.is_selected && item.menu_item_id) return

        const name = item.name || item.menu_item?.name || 'Unknown'
        const weight = item.weight_per_person || item.menu_item?.weight_per_person || 0
        const type = item.type || (item.menu_item?.type) || 'Other'

        // Создаем уникальный ключ для дедупликации (тип + название + вес)
        const itemKey = `${type}|${name}|${weight}`

        if (!seenItems.has(itemKey)) {
            if (!menuItemsByType[type]) menuItemsByType[type] = []
            menuItemsByType[type].push(item)
            seenItems.add(itemKey)
        }
    })

    const sortedTypes = Object.keys(menuItemsByType).sort()

    const tableNumbers = (reservation.table_ids?.length ? reservation.table_ids : (reservation.table ? [reservation.table.id] : []))
        .map(tid => reservation.tables?.find(t => t.id === tid)?.number)
        .filter(Boolean)
        .join(', ')

    const paidAmount = reservation.payments?.reduce((sum, p) => sum + p.amount, 0) || reservation.prepaid_amount || 0
    const remainingAmount = Math.max(0, reservation.total_amount - paidAmount)
    const surplusAmount = Math.max(0, paidAmount - reservation.total_amount)

    return (
        <div className="bg-white p-4 text-black leading-tight text-[11px] print:p-0">
            <PrintAutoStart />

            {/* Header - Very Compact */}
            <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-4">
                <div>
                    <h1 className="text-xl font-bold uppercase tracking-tighter">
                        Бронирование #{reservation.id.slice(0, 8)}
                    </h1>
                    <p className="text-[9px] text-stone-600 font-medium italic">Kucher & Conga</p>
                </div>
                <div className="text-right">
                    <div className="text-lg font-black">{formatDate(reservation.date)} в {formatTime(reservation.time)}</div>
                </div>
            </div>

            {/* Main Info Grid - Compact */}
            <div className="grid grid-cols-3 gap-6 mb-4">
                <div className="col-span-1 space-y-1">
                    <h2 className="text-[9px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 flex items-center gap-1">
                        <User className="h-3 w-3" /> Гость
                    </h2>
                    <div className="text-sm font-bold">
                        {reservation.guest?.last_name} {reservation.guest?.first_name}
                    </div>
                    {reservation.guest?.phone && (
                        <div className="flex items-center gap-1 text-black">
                            <Phone className="h-3 w-3" />
                            <span className="font-bold">{reservation.guest.phone}</span>
                        </div>
                    )}
                </div>

                <div className="col-span-1 space-y-1">
                    <h2 className="text-[9px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Размещение
                    </h2>
                    <div className="flex flex-col gap-0.5">
                        <div><span className="text-stone-700 font-bold uppercase text-[8px]">Зал:</span> <span className="font-bold">{reservation.hall?.name || '—'}</span></div>
                        <div><span className="text-stone-700 font-bold uppercase text-[8px]">Столы:</span> <span className="font-bold">{tableNumbers || '—'}</span></div>
                    </div>
                </div>

                <div className="col-span-1 space-y-1">
                    <h2 className="text-[9px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 flex items-center gap-1">
                        <Users className="h-3 w-3" /> Персоны
                    </h2>
                    <div className="text-sm font-bold">
                        {reservation.guests_count} взр.
                        {reservation.children_count > 0 && ` / ${reservation.children_count} дет.`}
                    </div>
                    <div className="text-[9px] text-stone-700 font-medium">{calculatePlates(reservation.guests_count)} тарелок</div>
                </div>
            </div>

            {/* Menu - Two Columns if possible */}
            <div className="mb-4">
                <h2 className="text-[9px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 mb-2 flex items-center gap-1">
                    <ChefHat className="h-3 w-3" /> Меню: {reservation.menu?.name || 'Индивидуально'}
                </h2>

                <div className="columns-2 gap-4 space-y-3">
                    {sortedTypes.map(type => {
                        const label = getMenuItemTypeLabel(type as MenuItemType, customTypes, true)
                        const items = menuItemsByType[type]

                        return (
                            <div key={type} className="break-inside-avoid mb-3">
                                <div className="bg-stone-50 px-2 py-0.5 mb-1 flex justify-between items-center border-l-2 border-black">
                                    <span className="font-bold uppercase text-[9px] tracking-wider text-black">{label}</span>
                                </div>
                                <table className="w-full text-[10px]">
                                    <tbody className="divide-y divide-stone-100">
                                        {items.map((item, idx) => {
                                            const name = item.name || item.menu_item?.name
                                            const weight = item.weight_per_person || item.menu_item?.weight_per_person || 0
                                            return (
                                                <tr key={item.id || idx}>
                                                    <td className="py-0.5 pr-2 text-black font-medium">{name}</td>
                                                    <td className="py-0.5 text-right text-stone-700 whitespace-nowrap">{weight}г</td>
                                                    <td className="py-0.5 text-right font-black w-12 whitespace-nowrap text-black">
                                                        {calculateTotalWeight(weight, reservation.guests_count)}г
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Footer Grid - Compact */}
            <div className="grid grid-cols-2 gap-8 pt-2 border-t border-black break-inside-avoid">
                <div className="space-y-2">
                    <h2 className="text-[9px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Комментарии
                    </h2>
                    <div className="text-[10px] text-black leading-snug whitespace-pre-wrap font-medium">
                        {reservation.comments || '—'}
                    </div>
                </div>

                <div className="space-y-1">
                    <h2 className="text-[9px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> Расчет
                    </h2>
                    <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-stone-700 font-bold">Сумма:</span>
                            <span className="font-black text-black">{formatCurrency(reservation.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-stone-700 font-bold">Оплачено:</span>
                            <span className="font-black text-black">{formatCurrency(paidAmount)}</span>
                        </div>
                        {surplusAmount > 0 && (
                            <div className="flex justify-between text-[10px]">
                                <span className="text-blue-700 font-bold italic">Излишек:</span>
                                <span className="font-black text-blue-800">{formatCurrency(surplusAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center border-t-2 border-black pt-1 mt-1">
                            <span className="font-black uppercase text-[10px] text-black">Остаток:</span>
                            <span className="text-lg font-black text-black">{formatCurrency(remainingAmount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 text-center text-[8px] text-stone-500 uppercase tracking-widest italic font-bold">
                {new Date().toLocaleString('ru-RU')} • Kucher&Conga
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          @page {
            size: A4;
            margin: 0.5cm;
          }
          body {
            background: white !important;
            margin: 0 !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            border-color: black !important;
            color-adjust: exact !important;
          }
          .columns-2 {
            column-count: 2;
          }
        }
        .columns-2 {
          column-count: 2;
        }
      `}} />
        </div>
    )
}
