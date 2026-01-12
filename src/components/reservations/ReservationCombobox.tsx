"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Reservation, ReservationStatus } from "@/types"
import { RESERVATION_STATUS_CONFIG } from "@/types"

interface ReservationComboboxProps {
    reservations: Reservation[]
    value?: string
    onChange: (value: string) => void
    disabled?: boolean
}

export function ReservationCombobox({ reservations, value, onChange, disabled }: ReservationComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const selectedReservation = reservations.find(r => r.id === value)

    // Filter reservations based on search
    const filteredReservations = React.useMemo(() => {
        if (!search) return reservations
        const searchLower = search.toLowerCase()
        return reservations.filter(reservation => {
            const guestName = `${reservation.guest?.last_name || ''} ${reservation.guest?.first_name || ''}`.toLowerCase()
            const phone = reservation.guest?.phone?.toLowerCase() || ''
            return guestName.includes(searchLower) || phone.includes(searchLower)
        })
    }, [reservations, search])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between font-normal text-left h-auto py-2"
                >
                    {selectedReservation ? (
                        <div className="flex flex-col">
                            <span className="font-medium">
                                {selectedReservation.guest?.last_name} {selectedReservation.guest?.first_name}
                            </span>
                            <span className="text-xs text-stone-500">
                                {formatDate(selectedReservation.date)} • {RESERVATION_STATUS_CONFIG[selectedReservation.status].label}
                            </span>
                        </div>
                    ) : (
                        <span className="text-stone-500">Выберите бронирование...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="p-2 border-b border-stone-100 flex items-center gap-2">
                    <Search className="w-4 h-4 text-stone-400" />
                    <Input
                        className="h-8 border-0 bg-transparent focus-visible:ring-0 p-0 text-sm placeholder:text-stone-400"
                        placeholder="Поиск по имени или телефону..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
                <ScrollArea className="h-[200px] md:h-[300px]">
                    {filteredReservations.length === 0 ? (
                        <div className="py-6 text-center text-sm text-stone-500">
                            Бронирование не найдено
                        </div>
                    ) : (
                        <div className="p-1">
                            {filteredReservations.map((reservation) => (
                                <div
                                    key={reservation.id}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-stone-100 hover:text-stone-900",
                                        value === reservation.id && "bg-stone-50"
                                    )}
                                    onClick={() => {
                                        onChange(reservation.id)
                                        setOpen(false)
                                        setSearch("")
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 shrink-0",
                                            value === reservation.id ? "text-primary opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">
                                            {reservation.guest?.last_name} {reservation.guest?.first_name}
                                        </span>
                                        <span className="text-xs text-stone-500">
                                            {formatDate(reservation.date)} • {RESERVATION_STATUS_CONFIG[reservation.status].label}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
