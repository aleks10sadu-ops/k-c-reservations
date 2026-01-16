"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Trash2,
    Plus,
    Minus,
    Scale,
    Edit2,
    Check,
    X,
    GripVertical
} from 'lucide-react'
import { ReservationMainMenuItem, MainMenuItem, MainMenuItemVariant } from '@/types'
import { cn } from '@/lib/utils'

interface SelectedMainMenuItemsProps {
    items: ReservationMainMenuItem[]
    onChange: (items: ReservationMainMenuItem[]) => void
    disabled?: boolean
    className?: string
}

export function SelectedMainMenuItems({
    items,
    onChange,
    disabled = false,
    className
}: SelectedMainMenuItemsProps) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editWeight, setEditWeight] = useState('')

    // Расчет итоговой суммы
    const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0)

    // Обновление позиции
    const updateItem = (id: string, updates: Partial<ReservationMainMenuItem>) => {
        onChange(items.map(item => {
            if (item.id !== id) return item

            const updated = { ...item, ...updates }

            // Пересчитываем total_price при изменении количества или веса
            if (updates.quantity !== undefined || updates.weight_grams !== undefined) {
                const quantity = updates.quantity ?? item.quantity
                const weightGrams = updates.weight_grams ?? item.weight_grams

                if (weightGrams && item.main_menu_item?.price_per_100g) {
                    // Весовая позиция
                    updated.unit_price = Math.round((item.main_menu_item.price_per_100g * weightGrams) / 100)
                    updated.total_price = updated.unit_price * quantity
                } else {
                    updated.total_price = updated.unit_price * quantity
                }
            }

            return updated
        }))
    }

    // Удаление позиции
    const removeItem = (id: string) => {
        onChange(items.filter(item => item.id !== id))
    }

    // Изменение количества
    const changeQuantity = (id: string, delta: number) => {
        const item = items.find(i => i.id === id)
        if (!item) return

        const newQuantity = Math.max(1, item.quantity + delta)
        updateItem(id, { quantity: newQuantity })
    }

    // Начало редактирования веса
    const startEditWeight = (item: ReservationMainMenuItem) => {
        setEditingId(item.id)
        setEditWeight(item.weight_grams?.toString() || '')
    }

    // Сохранение веса
    const saveWeight = (id: string) => {
        const weight = parseInt(editWeight, 10)
        if (weight > 0) {
            updateItem(id, { weight_grams: weight })
        }
        setEditingId(null)
        setEditWeight('')
    }

    // Отмена редактирования
    const cancelEdit = () => {
        setEditingId(null)
        setEditWeight('')
    }

    // Получение отображаемого названия
    const getDisplayName = (item: ReservationMainMenuItem) => {
        if (item.custom_name) return item.custom_name

        let name = item.main_menu_item?.name || 'Позиция'
        if (item.variant) {
            name += ` (${item.variant.name})`
        }
        return name
    }

    // Проверка, является ли позиция весовой
    const isWeightBased = (item: ReservationMainMenuItem) => {
        return item.main_menu_item?.price_per_100g && !item.main_menu_item?.price
    }

    if (items.length === 0) {
        return (
            <div className={cn("text-center py-8 text-muted-foreground", className)}>
                <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Позиции не добавлены</p>
                <p className="text-sm">Воспользуйтесь поиском выше для добавления блюд</p>
            </div>
        )
    }

    return (
        <div className={cn("space-y-2", className)}>
            <ScrollArea className="max-h-[400px]">
                <div className="space-y-1">
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors",
                                disabled && "opacity-60"
                            )}
                        >
                            {/* Ручка для перетаскивания (будущая функция) */}
                            <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />

                            {/* Номер */}
                            <span className="text-xs text-muted-foreground w-5 shrink-0">
                                {index + 1}.
                            </span>

                            {/* Название */}
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                    {getDisplayName(item)}
                                </div>
                                {item.notes && (
                                    <div className="text-xs text-muted-foreground truncate">
                                        {item.notes}
                                    </div>
                                )}
                            </div>

                            {/* Вес для весовых позиций */}
                            {isWeightBased(item) && (
                                <div className="flex items-center gap-1 shrink-0">
                                    {editingId === item.id ? (
                                        <>
                                            <Input
                                                type="number"
                                                value={editWeight}
                                                onChange={(e) => setEditWeight(e.target.value)}
                                                className="w-20 h-7 text-sm"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveWeight(item.id)
                                                    if (e.key === 'Escape') cancelEdit()
                                                }}
                                                autoFocus
                                            />
                                            <span className="text-xs text-muted-foreground">г</span>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6"
                                                onClick={() => saveWeight(item.id)}
                                            >
                                                <Check className="h-3 w-3 text-green-600" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6"
                                                onClick={cancelEdit}
                                            >
                                                <X className="h-3 w-3 text-red-600" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Badge
                                                variant="outline"
                                                className="text-amber-600 border-amber-300 cursor-pointer"
                                                onClick={() => !disabled && startEditWeight(item)}
                                            >
                                                <Scale className="h-3 w-3 mr-1" />
                                                {item.weight_grams}г
                                            </Badge>
                                            {!disabled && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6"
                                                    onClick={() => startEditWeight(item)}
                                                >
                                                    <Edit2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Количество */}
                            <div className="flex items-center gap-1 shrink-0">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => changeQuantity(item.id, -1)}
                                    disabled={disabled || item.quantity <= 1}
                                >
                                    <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center text-sm font-medium">
                                    {item.quantity}
                                </span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => changeQuantity(item.id, 1)}
                                    disabled={disabled}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>

                            {/* Цена за единицу */}
                            <div className="text-sm text-muted-foreground w-20 text-right shrink-0">
                                {item.unit_price.toLocaleString()} ₽
                            </div>

                            {/* Итоговая цена */}
                            <div className="font-medium text-sm w-24 text-right shrink-0">
                                {item.total_price.toLocaleString()} ₽
                            </div>

                            {/* Удаление */}
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeItem(item.id)}
                                disabled={disabled}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Итоговая сумма */}
            <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-sm text-muted-foreground">
                    Позиций: {items.length}
                </div>
                <div className="text-lg font-bold">
                    Итого: {totalAmount.toLocaleString()} ₽
                </div>
            </div>
        </div>
    )
}

// Хелпер для создания новой позиции из выбранного пункта меню
export function createReservationMainMenuItem(
    reservationId: string,
    item: MainMenuItem,
    variant?: MainMenuItemVariant,
    weightGrams?: number,
    orderIndex: number = 0
): ReservationMainMenuItem {
    let unitPrice: number
    let finalWeight = weightGrams

    if (variant?.price) {
        // Позиция с вариантом
        unitPrice = variant.price
    } else if (item.price_per_100g && weightGrams) {
        // Весовая позиция
        unitPrice = Math.round((item.price_per_100g * weightGrams) / 100)
    } else if (item.price) {
        // Обычная позиция с фиксированной ценой
        unitPrice = item.price
    } else {
        unitPrice = 0
    }

    return {
        id: crypto.randomUUID(),
        reservation_id: reservationId,
        main_menu_item_id: item.id,
        main_menu_item: item,
        variant_id: variant?.id,
        variant,
        quantity: 1,
        weight_grams: finalWeight,
        unit_price: unitPrice,
        total_price: unitPrice,
        order_index: orderIndex
    }
}
