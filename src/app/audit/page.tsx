"use client"

import { useEffect, useState } from 'react'
import { History, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { AuditCalendar } from '@/components/audit/AuditCalendar'
import { AuditLogDetailsModal } from '@/components/audit/AuditLogDetailsModal'
import { AuditLog } from '@/types'

const toast = {
    error: (msg: string) => alert(msg),
    success: (msg: string) => alert(msg)
}

export default function AuditPage() {
    const { role, isLoading: isAuthLoading } = useAuth()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isUndoing, setIsUndoing] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'year' | 'month' | 'day' | 'list'>('month')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
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
            setLogs(data as AuditLog[] || [])
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

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <History className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        )
    }

    if (role !== 'director' && role !== 'manager') {
        const isGuest = role === 'guest'
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
                <History className="w-16 h-16 text-stone-200" />
                <h2 className="text-xl font-semibold text-stone-900 text-center">Доступ ограничен</h2>
                <p className="text-stone-500 text-center max-w-md">
                    {isGuest
                        ? 'Ваш аккаунт ожидает подтверждения администратором.'
                        : 'Только управляющий или менеджер может просматривать логи аудита и отменять действия.'}
                </p>
                <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
                    <Button onClick={() => fetchLogs()} variant="outline">
                        Попробовать снова
                    </Button>
                </div>
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
                {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="h-24 w-full bg-stone-100 animate-pulse rounded-xl" />
                    ))
                ) : (
                    <>
                        <AuditCalendar
                            logs={filteredLogs}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            currentDate={currentDate}
                            onMonthChange={setCurrentDate}
                            onUndo={handleUndo}
                            isUndoingId={isUndoing}
                            onLogClick={(log) => setSelectedLog(log)}
                        />
                        <AuditLogDetailsModal
                            log={selectedLog}
                            isOpen={!!selectedLog}
                            onClose={() => setSelectedLog(null)}
                            onUndo={handleUndo}
                            isUndoing={isUndoing === selectedLog?.id}
                        />
                    </>
                )}
            </div>
        </div>
    )
}
