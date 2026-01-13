"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, RotateCcw, Search, Filter, ArrowUpDown, ChevronDown, Table2, Trash2, Edit3, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuth } from '@/hooks/use-auth'

const toast = {
    error: (msg: string) => alert(msg),
    success: (msg: string) => alert(msg)
}

interface AuditLog {
    id: string
    table_name: string
    record_id: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    old_data: any
    new_data: any
    changed_by: string
    created_at: string
    profiles?: {
        email: string
    }
}

export default function AuditPage() {
    const { role } = useAuth()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isUndoing, setIsUndoing] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchLogs()
    }, [])

    const fetchLogs = async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*, profiles:changed_by(email)')
                .order('created_at', { ascending: false })

            if (error) throw error
            setLogs(data || [])
        } catch (error: any) {
            console.error('Full fetch error:', error)
            toast.error(`Ошибка при загрузке логов: ${error.message || 'Неизвестная ошибка'}`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleUndo = async (logId: string) => {
        setIsUndoing(logId)
        try {
            const { error } = await supabase.rpc('undo_action', { log_id: logId })

            if (error) throw error

            toast.success('Действие успешно отменено')
            fetchLogs()
        } catch (error: any) {
            console.error('Error undoing action:', error)
            toast.error(`Ошибка при отмене: ${error.message}`)
        } finally {
            setIsUndoing(null)
        }
    }

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'INSERT': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0"><PlusCircle className="w-3 h-3 mr-1" /> Создание</Badge>
            case 'UPDATE': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0"><Edit3 className="w-3 h-3 mr-1" /> Изменение</Badge>
            case 'DELETE': return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0"><Trash2 className="w-3 h-3 mr-1" /> Удаление</Badge>
            default: return <Badge variant="outline">{action}</Badge>
        }
    }

    const getTableNameLabel = (table: string) => {
        switch (table) {
            case 'halls': return 'Залы'
            case 'tables': return 'Столы'
            case 'guests': return 'Гости'
            case 'reservations': return 'Бронирования'
            case 'payments': return 'Платежи'
            case 'menus': return 'Меню'
            case 'menu_items': return 'Позиции меню'
            default: return table
        }
    }

    if (isLoading) return null

    if (role !== 'director' && role !== 'manager') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <History className="w-16 h-16 text-stone-200" />
                <h2 className="text-xl font-semibold text-stone-900">Доступ ограничен</h2>
                <p className="text-stone-500 text-center max-w-md">
                    Только управляющий или менеджер может просматривать логи аудита и отменять действия.
                </p>
                <Button onClick={() => fetchLogs()} variant="outline" className="mt-4">
                    Попробовать снова
                </Button>
            </div>
        )
    }

    const filteredLogs = logs.filter(log =>
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Журнал действий</h1>
                    <p className="text-stone-500 mt-1">История изменений и возможность отмены действий администраторов</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <Input
                            placeholder="Поиск по таблице или email..."
                            className="pl-9 w-full md:w-80"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="h-24 w-full bg-stone-100 animate-pulse rounded-xl" />
                        ))
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
                            <History className="mx-auto h-12 w-12 text-stone-300 mb-4" />
                            <h3 className="text-lg font-medium text-stone-900">Действий не найдено</h3>
                            <p className="text-stone-500">Попробуйте изменить параметры поиска</p>
                        </div>
                    ) : (
                        filteredLogs.map((log) => (
                            <motion.div
                                key={log.id}
                                layout
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="overflow-hidden border-stone-200 hover:border-amber-200 transition-colors shadow-sm">
                                    <CardContent className="p-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center p-4 gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    {getActionBadge(log.action)}
                                                    <span className="text-sm font-medium text-stone-900">
                                                        в таблице <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">{getTableNameLabel(log.table_name)}</code>
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <History className="w-3.5 h-3.5" />
                                                        {format(new Date(log.created_at), 'd MMMM yyyy, HH:mm', { locale: ru })}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <PlusCircle className="w-3.5 h-3.5" />
                                                        {log.profiles?.email || 'Система'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2 text-stone-600"
                                                    onClick={() => console.log('View details', log)}
                                                >
                                                    Детали
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                    disabled={isUndoing === log.id}
                                                    onClick={() => handleUndo(log.id)}
                                                >
                                                    {isUndoing === log.id ? (
                                                        <motion.div
                                                            animate={{ rotate: -360 }}
                                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </motion.div>
                                                    ) : (
                                                        <RotateCcw className="h-4 w-4" />
                                                    )}
                                                    Откатить
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
