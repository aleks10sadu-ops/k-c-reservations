"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Table2, Users, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'

export default function PositionsPage() {
    const { role, isLoading: isAuthLoading } = useAuth()

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Table2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        )
    }

    if (role === 'guest' || !role) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4 text-center">
                <Table2 className="w-16 h-16 text-stone-200" />
                <h2 className="text-xl font-semibold text-stone-900">Доступ ограничен</h2>
                <p className="text-stone-500">Ваш аккаунт ожидает подтверждения администратором.</p>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Позиции</h1>
                    <p className="text-stone-500 mt-1">Расстановка персонала по столам и очередь обслуживания</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Очередь (Placeholders) */}
                <Card className="col-span-1 border-stone-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Очередь (без брони)
                        </CardTitle>
                        <CardDescription>Список столов, ожидающих обслуживания</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center py-10 text-stone-400">
                            Раздел находится в разработке
                        </div>
                    </CardContent>
                </Card>

                {/* Схема залов и назначение (Placeholders) */}
                <Card className="col-span-1 md:col-span-2 border-stone-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Table2 className="w-5 h-5 text-amber-500" />
                            Расстановка по залам
                        </CardTitle>
                        <CardDescription>Управление зонами ответственности официантов</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-20 text-stone-400">
                            Интерфейс распределения столов будет добавлен в следующем обновлении
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
