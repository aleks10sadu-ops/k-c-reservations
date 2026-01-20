"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, Clock, Save, Trash2, Plus, Loader2, ChevronLeft } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useReservationSettings } from '@/hooks/useSupabase'
import { updateReservationSetting } from '@/lib/supabase/api'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export default function ReservationSettingsPage() {
    const router = useRouter()
    const { data: rawSettings, loading, refetch } = useReservationSettings()
    const [restrictedDates, setRestrictedDates] = useState<string[]>([])
    const [restrictedTimes, setRestrictedTimes] = useState<Record<string, string[]>>({})
    const [isSaving, setIsSaving] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
    const [newTime, setNewTime] = useState('18:00')

    useEffect(() => {
        const datesSetting = rawSettings.find(s => s.key === 'restricted_dates')
        const timesSetting = rawSettings.find(s => s.key === 'restricted_times')

        if (datesSetting) setRestrictedDates(datesSetting.value || [])
        if (timesSetting) setRestrictedTimes(timesSetting.value || {})
    }, [rawSettings])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateReservationSetting('restricted_dates', restrictedDates)
            await updateReservationSetting('restricted_times', restrictedTimes)
            await refetch()
            alert('Настройки сохранены!')
        } catch (error) {
            console.error(error)
            alert('Ошибка при сохранении')
        } finally {
            setIsSaving(false)
        }
    }

    const toggleDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        if (restrictedDates.includes(dateStr)) {
            setRestrictedDates(restrictedDates.filter(d => d !== dateStr))
        } else {
            setRestrictedDates([...restrictedDates, dateStr])
        }
    }

    const addTimeRestriction = () => {
        if (!selectedDate) return
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const currentTimes = restrictedTimes[dateStr] || []
        if (!currentTimes.includes(newTime)) {
            setRestrictedTimes({
                ...restrictedTimes,
                [dateStr]: [...currentTimes, newTime].sort()
            })
        }
    }

    const removeTimeRestriction = (dateStr: string, time: string) => {
        const currentTimes = restrictedTimes[dateStr] || []
        const updatedTimes = currentTimes.filter(t => t !== time)

        const newRestrictedTimes = { ...restrictedTimes }
        if (updatedTimes.length === 0) {
            delete newRestrictedTimes[dateStr]
        } else {
            newRestrictedTimes[dateStr] = updatedTimes
        }
        setRestrictedTimes(newRestrictedTimes)
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        )
    }

    return (
        <PageTransition>
            <div className="mx-auto max-w-4xl px-4 py-8">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-stone-900">Ограничения бронирования</h1>
                            <p className="text-stone-500">Управление доступными датами и временем для гостей</p>
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Сохранить изменения
                    </Button>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    {/* Блокировка дат */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-amber-600" />
                                Заблокированные даты
                            </CardTitle>
                            <CardDescription>
                                Выберите даты, на которые бронирование будет полностью закрыто
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-center border rounded-xl p-4 bg-stone-50/50">
                                <DateTimePicker
                                    value={selectedDate}
                                    onChange={(dateStr: any) => {
                                        const date = new Date(dateStr)
                                        toggleDate(date)
                                        setSelectedDate(date)
                                    }}
                                    dateOnly
                                />
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {restrictedDates.length === 0 && (
                                    <p className="text-sm text-stone-400 italic text-center w-full py-4">Нет заблокированных дат</p>
                                )}
                                {restrictedDates.sort().map(date => (
                                    <Badge key={date} variant="secondary" className="gap-1 px-2 py-1">
                                        {format(new Date(date), 'd MMM yyyy', { locale: ru })}
                                        <button onClick={() => setRestrictedDates(restrictedDates.filter(d => d !== date))}>
                                            <Trash2 className="h-3 w-3 text-red-500 hover:text-red-700" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Блокировка времени */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-amber-600" />
                                Ограничения по времени
                            </CardTitle>
                            <CardDescription>
                                Заблокируйте конкретные часы для выбранных дат
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col gap-4 p-4 border rounded-xl bg-stone-50/50">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium">Выберите дату:</label>
                                    <DateTimePicker
                                        value={selectedDate}
                                        onChange={(dateStr: any) => setSelectedDate(new Date(dateStr))}
                                        dateOnly
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium">Время для блокировки:</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <DateTimePicker
                                                value={newTime}
                                                onChange={(_: any, time?: string) => time && setNewTime(time)}
                                                timeOnly
                                            />
                                        </div>
                                        <Button onClick={addTimeRestriction} variant="secondary" size="icon">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {Object.keys(restrictedTimes).length === 0 && (
                                    <p className="text-sm text-stone-400 italic text-center py-4">Нет ограничений по времени</p>
                                )}
                                {Object.keys(restrictedTimes).sort().map(dateStr => (
                                    <div key={dateStr} className="rounded-lg border bg-white p-3">
                                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                            <CalendarIcon className="h-3 w-3 opacity-50" />
                                            {format(new Date(dateStr), 'd MMMM yyyy', { locale: ru })}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {restrictedTimes[dateStr].map(time => (
                                                <Badge key={time} variant="outline" className="bg-amber-50 gap-1 border-amber-200">
                                                    {time}
                                                    <button onClick={() => removeTimeRestriction(dateStr, time)}>
                                                        <Trash2 className="h-3 w-3 text-red-500 hover:text-red-700" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageTransition>
    )
}
