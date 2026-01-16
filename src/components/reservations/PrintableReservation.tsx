import { formatCurrency, formatDate, formatTime, calculatePlates, calculateTotalWeight } from '@/lib/utils'
import { getMenuItemTypeLabel, MenuItemType, ReservationMenuItem, Reservation, MenuItem, CustomMenuItemType } from '@/types'
import { Users, MapPin, Phone, User, ChefHat, CreditCard, MessageSquare } from 'lucide-react'

interface PrintableReservationProps {
    reservation: Reservation
    menuItemsByType: Record<string, (MenuItem | ReservationMenuItem)[]>
    selectedSalads: string[]
    itemOverrides: Record<string, Partial<ReservationMenuItem>>
    adHocItems: ReservationMenuItem[]
    customTypes: CustomMenuItemType[]
}

export function PrintableReservation({
    reservation,
    menuItemsByType,
    selectedSalads,
    itemOverrides,
    adHocItems,
    customTypes
}: PrintableReservationProps) {
    const tableNumbers = (reservation.table_ids?.length ? reservation.table_ids : (reservation.table ? [reservation.table.id] : []))
        .map(tid => reservation.tables?.find(t => t.id === tid)?.number)
        .filter(Boolean)
        .join(', ')

    const paidAmount = reservation.payments?.reduce((sum, p) => sum + p.amount, 0) || reservation.prepaid_amount || 0
    const remainingAmount = Math.max(0, reservation.total_amount - paidAmount)

    const sortedTypes = Object.keys(menuItemsByType).sort()

    return (
        <div className="hidden print:block bg-white text-stone-900 leading-tight text-[11px] w-full min-h-screen p-0 m-0">
            {/* Header */}
            <div className="flex justify-between items-end border-b-2 border-stone-800 pb-2 mb-4">
                <div>
                    <h1 className="text-xl font-bold uppercase tracking-tighter">
                        Бронирование #{reservation.id.slice(0, 8)}
                    </h1>
                    <p className="text-[9px] text-stone-500 font-medium italic">Kucher & Conga</p>
                </div>
                <div className="text-right">
                    <div className="text-lg font-black">{formatDate(reservation.date)} в {formatTime(reservation.time)}</div>
                </div>
            </div>

            {/* Main Info */}
            <div className="grid grid-cols-3 gap-6 mb-4">
                <div className="col-span-1 space-y-1">
                    <h2 className="text-[9px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1 flex items-center gap-1">
                        <User className="h-3 w-3" /> Гость
                    </h2>
                    <div className="text-sm font-bold">
                        {reservation.guest?.last_name} {reservation.guest?.first_name}
                    </div>
                    {reservation.guest?.phone && (
                        <div className="flex items-center gap-1 text-stone-600">
                            <Phone className="h-3 w-3" />
                            <span className="font-medium">{reservation.guest.phone}</span>
                        </div>
                    )}
                </div>

                <div className="col-span-1 space-y-1">
                    <h2 className="text-[9px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Размещение
                    </h2>
                    <div className="flex flex-col gap-0.5">
                        <div><span className="text-stone-400 font-bold uppercase text-[8px]">Зал:</span> <span className="font-bold">{reservation.hall?.name || '—'}</span></div>
                        <div><span className="text-stone-400 font-bold uppercase text-[8px]">Столы:</span> <span className="font-bold">{tableNumbers || '—'}</span></div>
                    </div>
                </div>

                <div className="col-span-1 space-y-1">
                    <h2 className="text-[9px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1 flex items-center gap-1">
                        <Users className="h-3 w-3" /> Персоны
                    </h2>
                    <div className="text-sm font-bold">
                        {reservation.guests_count} взр.
                        {reservation.children_count > 0 && ` / ${reservation.children_count} дет.`}
                    </div>
                    <div className="text-[9px] text-stone-500">{calculatePlates(reservation.guests_count)} тарелок</div>
                </div>
            </div>

            {/* Menu */}
            <div className="mb-4">
                <h2 className="text-[9px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1 mb-2 flex items-center gap-1">
                    <ChefHat className="h-3 w-3" /> Меню: {reservation.menu?.name || 'Индивидуально'}
                </h2>

                <div className="columns-2 gap-4 space-y-3">
                    {sortedTypes.map(type => {
                        const items = menuItemsByType[type]
                        // Фильтруем только выбранные
                        const selectedItems = items.filter(item => {
                            const isAdHoc = !('menu_id' in item)
                            if (isAdHoc) return true
                            const mItem = item as MenuItem
                            if (!mItem.is_selectable) return true
                            return selectedSalads.includes(mItem.id)
                        })

                        if (selectedItems.length === 0) return null

                        const label = getMenuItemTypeLabel(type as MenuItemType, customTypes, true)

                        return (
                            <div key={type} className="break-inside-avoid mb-2">
                                <div className="bg-stone-50 px-2 py-0.5 mb-1 flex justify-between items-center border-l-2 border-stone-300">
                                    <span className="font-bold uppercase text-[9px] tracking-wider">{label}</span>
                                    <span className="text-[9px] font-black text-stone-400 uppercase italic whitespace-nowrap shrink-0">
                                        {calculatePlates(reservation.guests_count)} ТАРЕЛКИ
                                    </span>
                                </div>
                                <table className="w-full text-[10px]">
                                    <tbody className="divide-y divide-stone-50">
                                        {selectedItems.map((item, idx) => {
                                            const isAdHoc = !('menu_id' in item)
                                            const itemId = isAdHoc ? (item as ReservationMenuItem).id : (item as MenuItem).id
                                            const name = isAdHoc
                                                ? (item as ReservationMenuItem).name
                                                : (itemOverrides[itemId]?.name ?? (item as MenuItem).name)
                                            const weight = isAdHoc
                                                ? (item as ReservationMenuItem).weight_per_person
                                                : (itemOverrides[itemId]?.weight_per_person ?? (item as MenuItem).weight_per_person)

                                            return (
                                                <tr key={idx}>
                                                    <td className="py-0.5 pr-2 text-stone-800 font-medium">{name}</td>
                                                    <td className="py-0.5 text-right text-stone-400 whitespace-nowrap">{weight}г</td>
                                                    <td className="py-0.5 text-right font-bold w-12 whitespace-nowrap">
                                                        {calculateTotalWeight(weight || 0, reservation.guests_count)}г
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

            {/* Financials & Comments */}
            <div className="grid grid-cols-2 gap-8 pt-2 border-t border-stone-100 break-inside-avoid">
                <div className="space-y-2">
                    <h2 className="text-[9px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Комментарии
                    </h2>
                    <div className="text-[10px] text-stone-600 leading-snug whitespace-pre-wrap">
                        {reservation.comments || '—'}
                    </div>
                </div>

                <div className="space-y-1">
                    <h2 className="text-[9px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> Расчет
                    </h2>
                    <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-stone-400">Сумма:</span>
                            <span className="font-bold">{formatCurrency(reservation.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-stone-400">Оплачено:</span>
                            <span className="font-bold text-green-700">{formatCurrency(paidAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-stone-900 pt-1 mt-1">
                            <span className="font-black uppercase text-[10px]">Остаток:</span>
                            <span className="text-lg font-black">{formatCurrency(remainingAmount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 text-center text-[8px] text-stone-300 uppercase tracking-widest italic">
                {new Date().toLocaleString('ru-RU')} • Kucher&Conga Reservations
            </div>
        </div>
    )
}
