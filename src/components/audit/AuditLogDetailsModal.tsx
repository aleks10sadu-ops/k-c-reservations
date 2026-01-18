"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AuditLog, AUDIT_ACTION_CONFIG } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronRight, ArrowRight } from 'lucide-react'

interface AuditLogDetailsModalProps {
    log: AuditLog | null
    isOpen: boolean
    onClose: () => void
    onUndo?: (id: string) => void
    isUndoing?: boolean
}

export function AuditLogDetailsModal({ log, isOpen, onClose, onUndo, isUndoing }: AuditLogDetailsModalProps) {
    if (!log) return null

    const actionConfig = AUDIT_ACTION_CONFIG[log.action]

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return '—'
        if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
        if (typeof value === 'object') return JSON.stringify(value, null, 2)
        return String(value)
    }

    // Helper to determine what keys changed
    const getChangedKeys = () => {
        if (log.action === 'INSERT') return Object.keys(log.new_data || {})
        if (log.action === 'DELETE') return Object.keys(log.old_data || {})

        // For UPDATE, find keys that are different
        const oldKeys = Object.keys(log.old_data || {})
        const newKeys = Object.keys(log.new_data || {})
        const allKeys = Array.from(new Set([...oldKeys, ...newKeys]))

        return allKeys.filter(key => {
            // Skip system fields that might always change or are irrelevant
            if (['updated_at'].includes(key)) return false

            const oldValue = log.old_data?.[key]
            const newValue = log.new_data?.[key]
            return JSON.stringify(oldValue) !== JSON.stringify(newValue)
        })
    }

    const changedKeys = getChangedKeys()

    // For INSERT and DELETE we show just one column effectively, but we can reuse the logic
    const renderChanges = () => {
        if (changedKeys.length === 0) {
            return (
                <div className="text-center py-8 text-stone-500">
                    Нет зафиксированных изменений в полях данных
                </div>
            )
        }

        return (
            <div className="space-y-4">
                {changedKeys.map(key => {
                    const oldValue = log.old_data?.[key]
                    const newValue = log.new_data?.[key]
                    const isUpdate = log.action === 'UPDATE'

                    return (
                        <div key={key} className="p-3 bg-stone-50 rounded-lg border border-stone-100">
                            <div className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">
                                {key}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 text-sm">
                                {log.action !== 'INSERT' && (
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs text-stone-400 mb-1">Было</div>
                                        <div className="bg-red-50 text-red-900 px-2 py-1.5 rounded border border-red-100 break-all font-mono text-xs">
                                            {formatValue(oldValue)}
                                        </div>
                                    </div>
                                )}

                                {isUpdate && (
                                    <div className="flex items-center justify-center text-stone-300">
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                )}

                                {log.action !== 'DELETE' && (
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs text-stone-400 mb-1">Стало</div>
                                        <div className="bg-green-50 text-green-900 px-2 py-1.5 rounded border border-green-100 break-all font-mono text-xs">
                                            {formatValue(newValue)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 border-b border-stone-100 bg-white shadow-sm z-10">
                    <div className="flex items-center justify-between gap-4 mr-8">
                        <div className="space-y-1">
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                Детали события
                            </DialogTitle>
                            <DialogDescription>
                                Подробная информация об изменениях в базе данных
                            </DialogDescription>
                            <div className="flex items-center gap-2 text-sm text-stone-500">
                                <span>{format(new Date(log.created_at), 'd MMMM yyyy, HH:mm', { locale: ru })}</span>
                                <span>•</span>
                                <span>{log.profiles?.email || 'Система'}</span>
                            </div>
                        </div>

                        <Badge
                            className="border-0 px-3 py-1 text-sm whitespace-nowrap"
                            style={{
                                backgroundColor: actionConfig.bgColor,
                                color: actionConfig.color
                            }}
                        >
                            {actionConfig.label}
                        </Badge>
                    </div>
                </DialogHeader>

                {/* Using native div with Overflow-auto instead of ScrollArea for reliable scrolling */}
                <div className="flex-1 bg-white overflow-y-auto min-h-0">
                    <div className="p-6 space-y-6">

                        {/* Meta Info Section */}
                        <div className="grid grid-cols-2 gap-4 bg-stone-50/50 p-4 rounded-xl border border-stone-100">
                            <div>
                                <div className="text-xs text-stone-400 font-medium mb-1">Таблица</div>
                                <div className="font-mono text-sm">{log.table_name}</div>
                            </div>
                            <div>
                                <div className="text-xs text-stone-400 font-medium mb-1">Record ID</div>
                                <div className="font-mono text-sm truncate" title={log.record_id}>{log.record_id}</div>
                            </div>
                        </div>

                        {/* Changes Section */}
                        <div>
                            <h3 className="text-base font-semibold text-stone-900 mb-4">
                                {log.action === 'UPDATE' ? 'Измененные поля' :
                                    log.action === 'INSERT' ? 'Добавленные данные' : 'Удаленные данные'}
                            </h3>
                            {renderChanges()}
                        </div>

                    </div>
                </div>

                <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-2 z-10">
                    {onUndo && (
                        <Button
                            variant="default" // Use default variant (mostly black/dark) for primary action
                            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white border-none"
                            disabled={isUndoing}
                            onClick={() => {
                                if (confirm('Вы уверены, что хотите отменить это действие?')) {
                                    onUndo(log.id)
                                    onClose() // Close modal after initiating undo
                                }
                            }}
                        >
                            {isUndoing ? (
                                <div className="animate-spin">
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            ) : (
                                <ArrowRight className="h-4 w-4 rotate-180" />
                                // Using rotated ArrowRight as "Undo" icon or similar if RotateCcw not imported?
                                // Actually let's check import.
                            )}
                            Откатить изменения
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose}>
                        Закрыть
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
