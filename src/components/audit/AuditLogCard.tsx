import { motion } from 'framer-motion'
import { RotateCcw, PlusCircle, Edit3, Trash2, History } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AuditLog, AUDIT_ACTION_CONFIG } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface AuditLogCardProps {
    log: AuditLog
    isUndoing?: boolean
    onUndo?: (id: string) => void
    onViewDetails?: (log: AuditLog) => void
    compact?: boolean
}

export function AuditLogCard({ log, isUndoing, onUndo, onViewDetails, compact }: AuditLogCardProps) {
    const actionConfig = AUDIT_ACTION_CONFIG[log.action]

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'INSERT': return <PlusCircle className="w-3 h-3 mr-1" />
            case 'UPDATE': return <Edit3 className="w-3 h-3 mr-1" />
            case 'DELETE': return <Trash2 className="w-3 h-3 mr-1" />
            default: return null
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

    if (compact) {
        return (
            <Card className="overflow-hidden border-stone-200 hover:border-amber-200 transition-colors shadow-sm cursor-pointer hover:shadow-md">
                <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                        <Badge
                            variant="outline"
                            className="border-0 px-1.5 py-0.5"
                            style={{
                                backgroundColor: actionConfig.bgColor,
                                color: actionConfig.color
                            }}
                        >
                            {getActionIcon(log.action)}
                            {actionConfig.label}
                        </Badge>
                        <span className="text-xs text-stone-400">
                            {format(new Date(log.created_at), 'HH:mm')}
                        </span>
                    </div>
                    <div className="text-sm font-medium text-stone-900 mb-1">
                        {getTableNameLabel(log.table_name)}
                    </div>
                    <div className="text-xs text-stone-500 truncate">
                        {log.profiles?.email || 'Система'}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden border-stone-200 hover:border-amber-200 transition-colors shadow-sm">
            <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row sm:items-center p-4 gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <Badge
                                className="border-0"
                                style={{
                                    backgroundColor: actionConfig.bgColor,
                                    color: actionConfig.color
                                }}
                            >
                                {getActionIcon(log.action)}
                                {actionConfig.label}
                            </Badge>
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
                            onClick={() => onViewDetails?.(log)}
                        >
                            Детали
                        </Button>
                        {onUndo && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                disabled={isUndoing}
                                onClick={() => onUndo(log.id)}
                            >
                                {isUndoing ? (
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
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
