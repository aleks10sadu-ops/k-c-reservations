"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Briefcase, ChefHat, CheckSquare, Square, Calculator } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/hooks/use-auth'

export default function StaffPage() {
    const { role, user } = useAuth()

    // Mock data for demonstration
    const [staff, setStaff] = useState([
        { id: '1', name: 'Иван Иванов', role: 'waiter', type: 'floor', rate: 2500, days: [true, true, false, true, true, false, false], email: 'ivan@example.com' },
        { id: '2', name: 'Петр Петров', role: 'waiter', type: 'floor', rate: 2200, days: [true, false, true, true, false, true, true], email: 'petr@example.com' },
        { id: '3', name: 'Анна Сидорова', role: 'chef', type: 'kitchen', rate: 3500, days: [true, true, true, true, true, false, false], email: 'anna@example.com' },
    ])

    if (role === 'guest') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Users className="w-16 h-16 text-stone-200" />
                <h2 className="text-xl font-semibold text-stone-900">Доступ ограничен</h2>
                <p className="text-stone-500">Обратитесь к администратору для назначения роли.</p>
            </div>
        )
    }

    const isDirectorOrAdmin = role === 'director' || role === 'admin'
    const filteredStaff = isDirectorOrAdmin ? staff : staff.filter(s => s.email === user?.email)

    const renderTable = (type: 'floor' | 'kitchen', title: string, icon: any) => {
        const list = filteredStaff.filter(s => s.type === type)
        if (list.length === 0 && !isDirectorOrAdmin) return null

        return (
            <Card className="border-stone-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-stone-50/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        {icon}
                        {title}
                    </CardTitle>
                    <CardDescription>Учет рабочих дней и расчет зарплаты за неделю</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-stone-50/30">
                                <TableHead className="w-[200px]">ФИО</TableHead>
                                <TableHead>Ставка</TableHead>
                                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                                    <TableHead key={day} className="text-center">{day}</TableHead>
                                ))}
                                <TableHead className="text-right">Итого</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {list.map((member) => {
                                const totalDays = member.days.filter(Boolean).length
                                const totalPay = totalDays * member.rate

                                return (
                                    <TableRow key={member.id} className="hover:bg-amber-50/30 transition-colors">
                                        <TableCell className="font-medium">{member.name}</TableCell>
                                        <TableCell>{member.rate} ₽</TableCell>
                                        {member.days.map((worked, idx) => (
                                            <TableCell key={idx} className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={isDirectorOrAdmin ? "hover:bg-amber-100" : "cursor-default"}
                                                    disabled={!isDirectorOrAdmin}
                                                >
                                                    {worked ?
                                                        <CheckSquare className="w-5 h-5 text-amber-600" /> :
                                                        <Square className="w-5 h-5 text-stone-300" />
                                                    }
                                                </Button>
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-bold text-amber-700">
                                            {totalPay} ₽
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Персонал</h1>
                    <p className="text-stone-500 mt-1">Управление графиком и расчет заработной платы</p>
                </div>
                {isDirectorOrAdmin && (
                    <Button className="gap-2">
                        <Calculator className="w-4 h-4" />
                        Выгрузить отчет
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                {renderTable('floor', 'Зал (Официанты)', <Briefcase className="w-5 h-5 text-amber-500" />)}
                {renderTable('kitchen', 'Кухня', <ChefHat className="w-5 h-5 text-amber-500" />)}
            </div>
        </div>
    )
}
