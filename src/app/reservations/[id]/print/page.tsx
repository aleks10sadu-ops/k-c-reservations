import { getReservationById, getMenuItemTypes } from '@/lib/supabase/api'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, formatTime, calculatePlates, calculateTotalWeight } from '@/lib/utils'
import { getNowInMoscow, formatDateTimeRu } from '@/lib/date-utils'
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

    // Группировка позиций меню по типу
    const menuItemsByType: Record<string, (any)[]> = {}
    const seenItems = new Set<string>()

    if (reservation.menu_type === 'main_menu') {
        reservation.main_menu_items?.forEach(item => {
            const name = item.custom_name || item.main_menu_item?.name || 'Unknown'
            const variantName = item.variant?.name ? ` (${item.variant.name})` : ''
            const type = item.main_menu_item?.category?.name || item.main_menu_item?.category_name || 'Основное меню'

            if (!menuItemsByType[type]) menuItemsByType[type] = []
            menuItemsByType[type].push({
                ...item,
                displayName: name + variantName,
                displayWeight: item.weight_grams ? `${item.weight_grams}г` : (item.main_menu_item?.weight || ''),
                displayTotalWeight: item.weight_grams ? `${item.weight_grams * item.quantity}г` : ''
            })
        })
    } else {
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
    }

    const sortedTypes = Object.keys(menuItemsByType).sort()

    const tableNumbers = (reservation.table_ids?.length ? reservation.table_ids : (reservation.table ? [reservation.table.id] : []))
        .map(tid => reservation.tables?.find(t => t.id === tid)?.number)
        .filter(Boolean)
        .join(', ')

    const paidAmount = reservation.payments?.reduce((sum, p) => sum + p.amount, 0) || reservation.prepaid_amount || 0
    const remainingAmount = Math.max(0, reservation.total_amount - paidAmount)
    const surplusAmount = Math.max(0, paidAmount - reservation.total_amount)

    return (
        <div className="bg-white p-4 text-black leading-tight text-[13px] print:p-0">
            <PrintAutoStart />

            {/* Header - Very Compact */}
            <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-4">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-tighter">
                        Бронирование #{reservation.id.slice(0, 8)}
                    </h1>
                    <p className="text-[11px] text-stone-600 font-medium italic">Kucher & Conga</p>
                </div>
                <div className="text-right">
                    <div className="text-xl font-black">{formatDate(reservation.date)} в {formatTime(reservation.time)}</div>
                </div>
            </div>

            {/* Main Info Grid - Compact */}
            <div className="grid grid-cols-3 gap-6 mb-4">
                <div className="col-span-1 space-y-1">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 flex items-center gap-1">
                        <User className="h-3 w-3" /> Гость
                    </h2>
                    <div className="text-base font-bold">
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
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Размещение
                    </h2>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-baseline gap-2">
                            <span className="text-stone-700 font-bold uppercase text-[10px] min-w-[40px]">Зал:</span>
                            <span className="font-bold text-base">{reservation.hall?.name || '—'}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-stone-700 font-bold uppercase text-[10px] min-w-[40px]">Столы:</span>
                            <span className="font-bold text-base">{tableNumbers || '—'}</span>
                        </div>
                    </div>
                </div>

                <div className="col-span-1 space-y-1">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 flex items-center gap-1">
                        <Users className="h-3 w-3" /> Персоны
                    </h2>
                    <div className="text-base font-bold">
                        {reservation.guests_count} взр.
                        {reservation.children_count > 0 && ` / ${reservation.children_count} дет.`}
                    </div>
                    <div className="text-[11px] text-stone-700 font-medium">{calculatePlates(reservation.guests_count)} тарелок</div>
                </div>
            </div>

            {/* Menu - Two Columns if possible */}
            <div className="mb-4">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 mb-2 flex items-center gap-1">
                    <ChefHat className="h-3 w-3" /> Меню: {reservation.menu_type === 'main_menu' ? 'Основное меню' : (reservation.menu?.name || 'Индивидуально')}
                </h2>

                <div className="columns-2 gap-4 space-y-3">
                    {sortedTypes.map(type => {
                        const label = reservation.menu_type === 'main_menu' ? type : getMenuItemTypeLabel(type as MenuItemType, customTypes, true)
                        const items = menuItemsByType[type]

                        return (
                            <div key={type} className="break-inside-avoid mb-3">
                                <div className="bg-stone-50 px-2 py-0.5 mb-1 flex justify-between items-center border-l-2 border-black">
                                    <span className="font-bold uppercase text-[11px] tracking-wider text-black">{label}</span>
                                    {reservation.menu_type === 'banquet' && (
                                        <span className="text-[10px] font-black text-stone-600 uppercase italic whitespace-nowrap shrink-0">
                                            {calculatePlates(reservation.guests_count)} ТАРЕЛКИ
                                        </span>
                                    )}
                                </div>
                                <table className="w-full text-[12px]">
                                    <tbody className="divide-y divide-stone-100">
                                        {items.map((item, idx) => {
                                            if (reservation.menu_type === 'main_menu') {
                                                return (
                                                    <tr key={item.id || idx}>
                                                        <td className="py-1 pr-2 text-black font-medium">{item.displayName}</td>
                                                        <td className="py-1 text-right text-stone-700 whitespace-nowrap">{item.quantity} шт.</td>
                                                        <td className="py-1 text-right font-black w-14 whitespace-nowrap text-black">
                                                            {formatCurrency(item.total_price)}
                                                        </td>
                                                    </tr>
                                                )
                                            }

                                            const name = item.name || item.menu_item?.name
                                            const weight = item.weight_per_person || item.menu_item?.weight_per_person || 0
                                            return (
                                                <tr key={item.id || idx}>
                                                    <td className="py-1 pr-2 text-black font-medium">{name}</td>
                                                    <td className="py-1 text-right text-stone-700 whitespace-nowrap">{weight}г</td>
                                                    <td className="py-1 text-right font-black w-14 whitespace-nowrap text-black">
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
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Комментарии
                    </h2>
                    <div className="text-[12px] text-black leading-snug whitespace-pre-wrap font-medium">
                        {reservation.comments || '—'}
                    </div>
                </div>

                <div className="space-y-1">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-black border-b border-stone-200 pb-1 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> Расчет
                    </h2>
                    <div className="space-y-0.5">
                        <div className="flex justify-between text-[12px]">
                            <span className="text-stone-700 font-bold">Сумма:</span>
                            <span className="font-black text-black">{formatCurrency(reservation.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-[12px]">
                            <span className="text-stone-700 font-bold">Оплачено:</span>
                            <span className="font-black text-black">{formatCurrency(paidAmount)}</span>
                        </div>
                        {surplusAmount > 0 && (
                            <div className="flex justify-between text-[12px]">
                                <span className="text-blue-700 font-bold italic">Излишек:</span>
                                <span className="font-black text-blue-800">{formatCurrency(surplusAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center border-t-2 border-black pt-1 mt-1">
                            <span className="font-black uppercase text-[12px] text-black">Остаток:</span>
                            <span className="text-xl font-black text-black">{formatCurrency(remainingAmount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 text-center text-[10px] text-stone-500 uppercase tracking-widest italic font-bold">
                {formatDateTimeRu(getNowInMoscow())} • Kucher&Conga
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
