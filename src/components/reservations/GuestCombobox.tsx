"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Guest } from "@/types"

interface GuestComboboxProps {
    guests: Guest[]
    value?: string
    onChange: (value: string) => void
}

export function GuestCombobox({ guests, value, onChange }: GuestComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const selectedGuest = guests.find(g => g.id === value)

    // Filter guests based on search
    const filteredGuests = React.useMemo(() => {
        if (!search) return guests
        const searchLower = search.toLowerCase()
        return guests.filter(guest => {
            const fullName = `${guest.last_name} ${guest.first_name}`.toLowerCase()
            const phone = guest.phone.toLowerCase()
            return fullName.includes(searchLower) || phone.includes(searchLower)
        })
    }, [guests, search])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal text-left h-auto py-3 md:py-2"
                >
                    {selectedGuest ? (
                        <div className="flex flex-col md:flex-row md:gap-2 items-start md:items-center">
                            <span className="font-medium">{selectedGuest.last_name} {selectedGuest.first_name}</span>
                            <span className="text-xs md:text-sm text-stone-500">{selectedGuest.phone}</span>
                        </div>
                    ) : (
                        <span className="text-stone-500">Выберите гостя...</span>
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
                    {filteredGuests.length === 0 ? (
                        <div className="py-6 text-center text-sm text-stone-500">
                            Гость не найден
                        </div>
                    ) : (
                        <div className="p-1">
                            {filteredGuests.map((guest) => (
                                <div
                                    key={guest.id}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-stone-100 hover:text-stone-900",
                                        value === guest.id && "bg-stone-50"
                                    )}
                                    onClick={() => {
                                        onChange(guest.id)
                                        setOpen(false)
                                        setSearch("")
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 shrink-0",
                                            value === guest.id ? "text-primary opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{guest.last_name} {guest.first_name}</span>
                                        <span className="text-xs text-stone-500">{guest.phone}</span>
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
