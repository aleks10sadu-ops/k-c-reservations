"use client"

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users,
    Briefcase,
    ChefHat,
    CheckSquare,
    Square,
    Calculator,
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    TrendingUp,
    TrendingDown,
    Save,
    Download,
    Settings,
    Phone,
    FileText,
    Calendar,
    BookOpen,
    AlertCircle,
    GripVertical
} from 'lucide-react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { useStaff, useStaffRoles, useStaffShifts, useHealthBooks, useCreateMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useSupabase'
import { StaffMember, StaffRole, StaffShift, HealthBook, ShiftType } from '@/types'
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { ru } from 'date-fns/locale'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export default function StaffPage() {
    const { role: userRole, user, isLoading: isAuthLoading } = useAuth()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [isAddStaffOpen, setIsAddStaffOpen] = useState(false)
    const [isReportingOpen, setIsReportingOpen] = useState(false)
    const [isRolesManageOpen, setIsRolesManageOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('schedule')
    const [departmentTab, setDepartmentTab] = useState<'hall' | 'kitchen'>('hall')

    // Hooks
    const { data: roles, refetch: refetchRoles } = useStaffRoles()
    const { data: staff, refetch: refetchStaff } = useStaff()
    const { data: healthBooks, refetch: refetchHealthBooks } = useHealthBooks()

    // Week range
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    const startDateStr = format(weekDays[0], 'yyyy-MM-dd')
    const endDateStr = format(weekDays[6], 'yyyy-MM-dd')

    const { data: shifts, refetch: refetchShifts } = useStaffShifts({
        startDate: startDateStr,
        endDate: endDateStr
    })

    // Mutations
    const { mutate: createStaff } = useCreateMutation<StaffMember>('staff')
    const { mutate: updateStaff } = useUpdateMutation<StaffMember>('staff')
    const { mutate: deleteStaff } = useDeleteMutation('staff')
    const { mutate: createShift } = useCreateMutation<StaffShift>('staff_shifts')
    const { mutate: updateShift } = useUpdateMutation<StaffShift>('staff_shifts')
    const { mutate: createRole } = useCreateMutation<StaffRole>('staff_roles')
    const { mutate: updateRole } = useUpdateMutation<StaffRole>('staff_roles')

    // Filters & Calculations
    const isDirectorOrAdmin = userRole === 'director' || userRole === 'admin'
    const filteredStaff = useMemo(() => {
        if (!staff) return []
        if (isDirectorOrAdmin) return staff
        return staff.filter(s => s.profile_id === user?.id || s.email === user?.email)
    }, [staff, isDirectorOrAdmin, user])

    const getShift = (staffId: string, date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        return shifts?.find(s => s.staff_id === staffId && s.date === dateStr)
    }

    const toggleShift = async (staffId: string, date: Date) => {
        if (!isDirectorOrAdmin) return

        const existing = getShift(staffId, date)
        const dateStr = format(date, 'yyyy-MM-dd')

        console.log('[toggleShift] Interaction:', { staffId, dateStr, existingFound: !!existing })

        try {
            if (!existing) {
                // Пытаемся создать. Если запись уже есть, сработает уникальный индекс.
                const created = await createShift({
                    staff_id: staffId,
                    date: dateStr,
                    shift_type: 'full',
                    bonus: 0,
                    fine: 0
                })

                if (!created) {
                    console.warn('[toggleShift] Creation failed (possible duplicate or error), refetching...')
                    refetchShifts()
                } else {
                    refetchShifts()
                }
            } else {
                const nextType: ShiftType =
                    existing.shift_type === 'full' ? 'half' :
                        existing.shift_type === 'half' ? 'none' : 'full'

                await updateShift(existing.id, { shift_type: nextType })
                refetchShifts()
            }
        } catch (err) {
            console.error('[toggleShift] Exception:', err)
            refetchShifts()
        }
    }

    const updateStaffInfo = async (id: string, updates: Partial<StaffMember>) => {
        if (!isDirectorOrAdmin) return
        await updateStaff(id, updates)
        refetchStaff()
    }

    const updateShiftFinance = async (shift: StaffShift, updates: Partial<StaffShift>) => {
        if (!isDirectorOrAdmin) return
        await updateShift(shift.id, updates)
        refetchShifts()
    }

    const exportToExcel = async (reportStartDate: Date, reportEndDate: Date) => {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Отчет по персоналу')

        worksheet.columns = [
            { header: 'Сотрудник', key: 'name', width: 25 },
            { header: 'Роль', key: 'role', width: 15 },
            { header: 'Ставка (баз)', key: 'rate', width: 15 },
            { header: 'Смен (1.0)', key: 'full', width: 10 },
            { header: 'Смен (0.5)', key: 'half', width: 10 },
            { header: 'Премии', key: 'bonus', width: 12 },
            { header: 'Штрафы', key: 'fine', width: 12 },
            { header: 'Итого к выплате', key: 'total', width: 18 },
        ]

        filteredStaff.forEach(member => {
            const memberShifts = shifts?.filter(s => s.staff_id === member.id) || []
            const fullShifts = memberShifts.filter(s => s.shift_type === 'full').length
            const halfShifts = memberShifts.filter(s => s.shift_type === 'half').length
            const totalBonus = memberShifts.reduce((sum, s) => sum + Number(s.bonus || 0), 0)
            const totalFine = memberShifts.reduce((sum, s) => sum + Number(s.fine || 0), 0)

            const totalPay = (fullShifts * member.base_rate) + (halfShifts * member.base_rate * 0.5) + totalBonus - totalFine

            worksheet.addRow({
                name: member.name,
                role: member.role?.name || 'Нет роли',
                rate: member.base_rate,
                full: fullShifts,
                half: halfShifts,
                bonus: totalBonus,
                fine: totalFine,
                total: totalPay
            })
        })

        const buffer = await workbook.xlsx.writeBuffer()
        saveAs(new Blob([buffer]), `staff_report_${format(reportStartDate, 'dd-MM-yyyy')}_${format(reportEndDate, 'dd-MM-yyyy')}.xlsx`)
    }

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Users className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        )
    }

    if (userRole === 'guest' || !userRole) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4 text-center">
                <Users className="w-16 h-16 text-stone-200" />
                <h2 className="text-xl font-semibold text-stone-900">Доступ ограничен</h2>
                <p className="text-stone-500">Ваш аккаунт ожидает подтверждения администратором.</p>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7-xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-2xl text-amber-700 hidden sm:block">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Персонал</h1>
                        <p className="text-stone-500 mt-1">Управление сотрудниками и графиком</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isDirectorOrAdmin && (
                        <>
                            <Dialog open={isReportingOpen} onOpenChange={setIsReportingOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2 border-stone-200 hover:bg-stone-50 transition-colors">
                                        <Download className="w-4 h-4 text-stone-500" />
                                        Отчеты
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Выгрузка отчета в Excel</DialogTitle>
                                        <DialogDescription>
                                            Выберите период для выгрузки статистики по сменам сотрудников.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <Button className="w-full justify-start gap-2" onClick={() => exportToExcel(startOfMonth(new Date()), endOfMonth(new Date()))}>
                                            <Calendar className="w-4 h-4" />
                                            За текущий месяц
                                        </Button>
                                        <Button className="w-full justify-start gap-2" onClick={() => exportToExcel(addDays(new Date(), -30), new Date())}>
                                            <Calendar className="w-4 h-4" />
                                            За последние 30 дней
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isRolesManageOpen} onOpenChange={setIsRolesManageOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon" className="border-stone-200">
                                        <Settings className="w-4 h-4 text-stone-500" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Категории сотрудников</DialogTitle>
                                        <DialogDescription>
                                            Управление списком должностей и их ставками.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <RolesManageDialog
                                        roles={roles || []}
                                        onSuccess={() => refetchRoles()}
                                        createRole={createRole}
                                        updateRole={updateRole}
                                    />
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-md shadow-amber-100 transition-all active:scale-95">
                                        <Plus className="w-4 h-4" />
                                        Сотрудник
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>Новый сотрудник</DialogTitle>
                                        <DialogDescription>
                                            Заполните данные для добавления нового сотрудника в систему.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <StaffForm
                                        roles={roles || []}
                                        onSuccess={() => {
                                            setIsAddStaffOpen(false)
                                            refetchStaff()
                                        }}
                                        onSubmit={createStaff}
                                    />
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-stone-100/80 p-1 rounded-xl mb-4">
                    <TabsTrigger value="schedule" className="rounded-lg gap-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300">
                        <Calendar className="w-4 h-4" />
                        График сотрудников
                    </TabsTrigger>
                    <TabsTrigger value="health-books" className="rounded-lg gap-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300">
                        <BookOpen className="w-4 h-4" />
                        Медкнижки
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="schedule" className="space-y-6 focus-visible:outline-none">
                    {/* Week Navigation */}
                    <Card className="border-stone-200 bg-white/50 backdrop-blur-sm shadow-sm">
                        <CardContent className="p-4 flex flex-col lg:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="hover:bg-amber-50 text-amber-900 border border-stone-100">
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                                <div className="text-lg font-bold text-stone-800 min-w-[240px] text-center bg-stone-50 py-1 px-4 rounded-lg border border-stone-100 shadow-inner">
                                    {format(weekDays[0], 'd MMMM', { locale: ru })} — {format(weekDays[6], 'd MMMM yyyy', { locale: ru })}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="hover:bg-amber-50 text-amber-900 border border-stone-100">
                                    <ChevronRight className="w-5 h-5" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="ml-2 border-amber-200 text-amber-800 hover:bg-amber-50 shadow-sm active:scale-95">Сегодня</Button>
                            </div>

                            <div className="flex p-1 bg-stone-100/50 rounded-xl border border-stone-200 shadow-sm">
                                <button
                                    onClick={() => setDepartmentTab('hall')}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${departmentTab === 'hall' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                >
                                    <Users className="w-4 h-4" />
                                    Зал
                                </button>
                                <button
                                    onClick={() => setDepartmentTab('kitchen')}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${departmentTab === 'kitchen' ? 'bg-white text-amber-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                >
                                    <ChefHat className="w-4 h-4" />
                                    Кухня
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Staff Tables by Role */}
                    <div className="space-y-8">
                        {roles?.filter(r => (r.department || 'hall') === departmentTab)
                            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                            .map(role => {
                                const roleStaff = filteredStaff.filter(s => {
                                    const isCorrectRole = s.role_id === role.id
                                    const hasShiftsInView = shifts?.some(shift => shift.staff_id === s.id)
                                    return isCorrectRole && (s.is_active || hasShiftsInView)
                                })
                                if (roleStaff.length === 0 && !isDirectorOrAdmin) return null

                                return (
                                    <Card key={role.id} className="border-stone-200 shadow-sm overflow-hidden bg-white/40 backdrop-blur-sm group hover:border-amber-200 transition-colors">
                                        <CardHeader className="bg-stone-50/50 border-b py-3 px-6 flex flex-row items-center justify-between">
                                            <CardTitle className="text-lg font-bold text-stone-800 flex items-center gap-2">
                                                <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                                                {role.name}
                                            </CardTitle>
                                            <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">{roleStaff.length} чел.</span>
                                        </CardHeader>
                                        <CardContent className="p-0 overflow-x-auto">
                                            <Table className="table-fixed w-full">
                                                <TableHeader>
                                                    <TableRow className="bg-stone-50/30">
                                                        <TableHead className="w-[200px] pl-6 text-xs uppercase text-stone-400 font-bold">Сотрудник</TableHead>
                                                        {weekDays.map(day => (
                                                            <TableHead key={day.toISOString()} className="text-center p-2 w-[80px]">
                                                                <div className="text-[10px] text-stone-400 uppercase font-bold tracking-tighter">{format(day, 'EEE', { locale: ru })}</div>
                                                                <div className={isSameDay(day, new Date()) ? "text-amber-600 font-extrabold scale-110" : "text-stone-600 font-medium"}>
                                                                    {format(day, 'd.MM')}
                                                                </div>
                                                            </TableHead>
                                                        ))}
                                                        <TableHead className="text-right pr-6 w-[140px] text-xs uppercase text-stone-400 font-bold">Итог за неделю</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {roleStaff.map(member => (
                                                        <StaffRow
                                                            key={member.id}
                                                            member={member}
                                                            weekDays={weekDays}
                                                            getShift={getShift}
                                                            toggleShift={toggleShift}
                                                            isDirectorOrAdmin={isDirectorOrAdmin}
                                                            updateStaffInfo={updateStaffInfo}
                                                            updateShiftFinance={updateShiftFinance}
                                                            roles={roles || []}
                                                            refetchStaff={refetchStaff}
                                                        />
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                    </div>
                </TabsContent>

                <TabsContent value="health-books" className="focus-visible:outline-none">
                    <HealthBooksView
                        healthBooks={healthBooks || []}
                        staff={filteredStaff}
                        refetch={refetchHealthBooks}
                        isDirectorOrAdmin={isDirectorOrAdmin}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function StaffRow({ member, weekDays, getShift, toggleShift, isDirectorOrAdmin, updateStaffInfo, updateShiftFinance, roles, refetchStaff }: any) {
    const [isEditOpen, setIsEditOpen] = useState(false)
    const memberShifts = weekDays.map((day: Date) => getShift(member.id, day)).filter(Boolean)
    const stats = useMemo(() => {
        let full = 0
        let half = 0
        let totalBonus = 0
        let totalFine = 0

        memberShifts.forEach((s: StaffShift) => {
            if (s.shift_type === 'full') full++
            else if (s.shift_type === 'half') half++
            totalBonus += Number(s.bonus || 0)
            totalFine += Number(s.fine || 0)
        })

        const totalPay = (full * member.base_rate) + (half * member.base_rate * 0.5) + totalBonus - totalFine
        return { full, half, totalBonus, totalFine, totalPay }
    }, [memberShifts, member.base_rate])

    return (
        <TableRow className={`hover:bg-amber-50/10 transition-colors border-b border-stone-100/50 ${!member.is_active ? 'opacity-50 grayscale-[0.5]' : ''}`}>
            <TableCell className="p-4 pl-6 w-[200px]">
                <div className="flex flex-col gap-0.5 overflow-hidden">
                    <div className="flex items-center gap-2 group/name max-w-full">
                        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                            <DialogTrigger asChild>
                                <span
                                    className="text-stone-900 font-bold cursor-pointer hover:text-amber-600 border-b border-transparent hover:border-amber-400 transition-all truncate block flex-1"
                                    title={member.name}
                                >
                                    {member.name}
                                </span>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Карточка сотрудника: {member.name}</DialogTitle>
                                    <DialogDescription>
                                        Просмотр и редактирование данных сотрудника.
                                    </DialogDescription>
                                </DialogHeader>
                                <StaffForm
                                    member={member}
                                    roles={roles}
                                    onSuccess={() => {
                                        setIsEditOpen(false)
                                        refetchStaff()
                                    }}
                                    onSubmit={(updates: any) => updateStaffInfo(member.id, updates)}
                                />
                            </DialogContent>
                        </Dialog>

                        {!member.is_active && (
                            <span className="text-[9px] bg-stone-200 text-stone-600 px-1 rounded uppercase font-bold">Архив</span>
                        )}
                        {member.notes && (
                            <div title={member.notes} className="cursor-help">
                                <FileText className="w-3.5 h-3.5 text-stone-300 hover:text-amber-500 transition-colors" />
                            </div>
                        )}
                        {isDirectorOrAdmin && (
                            <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    className={`p-1.5 rounded-md border border-stone-100 bg-white transition-all shadow-sm ${member.is_active ? 'hover:text-red-500 hover:border-red-200' : 'hover:text-green-500 hover:border-green-200'}`}
                                    title={member.is_active ? "Архивировать" : "Восстановить"}
                                    onClick={() => {
                                        if (confirm(member.is_active ? `Архивировать ${member.name}?` : `Восстановить ${member.name}?`)) {
                                            updateStaffInfo(member.id, { is_active: !member.is_active })
                                        }
                                    }}
                                >
                                    {member.is_active ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-stone-400">
                        {member.phone && (
                            <div className="flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                {member.phone}
                            </div>
                        )}
                    </div>
                </div>
            </TableCell>

            {weekDays.map((day: Date) => {
                const shift = getShift(member.id, day)
                const isToday = isSameDay(day, new Date())
                return (
                    <TableCell key={day.toISOString()} className={`text-center p-1 px-2 ${isToday ? "bg-amber-50/20" : ""}`}>
                        <div className="flex flex-col items-center gap-1.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`w-11 h-11 rounded-xl transition-all border border-stone-50 ${isDirectorOrAdmin && member.is_active ? "hover:scale-110 hover:bg-white hover:border-amber-200 hover:shadow-md" : "cursor-default opacity-40 hover:bg-transparent"}`}
                                onClick={() => member.is_active && toggleShift(member.id, day)}
                                disabled={!isDirectorOrAdmin || !member.is_active}
                            >
                                {renderShiftIcon(shift?.shift_type || 'none')}
                            </Button>

                            {shift && isDirectorOrAdmin && (
                                <ShiftFinancePopover
                                    shift={shift}
                                    onUpdate={(updates: any) => updateShiftFinance(shift, updates)}
                                />
                            )}
                        </div>
                    </TableCell>
                )
            })}

            <TableCell className="text-right p-4 pr-6">
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-amber-900 text-base">{stats.totalPay.toLocaleString()} ₽</span>
                    <div className="flex flex-wrap justify-end gap-1 text-[9px] font-bold">
                        {stats.full > 0 && <span className="bg-stone-100 text-stone-500 px-1 rounded">{stats.full}f</span>}
                        {stats.half > 0 && <span className="bg-stone-100 text-stone-500 px-1 rounded">{stats.half}h</span>}
                        {stats.totalBonus > 0 && <span className="bg-green-100 text-green-700 px-1 rounded">+{stats.totalBonus}</span>}
                        {stats.totalFine > 0 && <span className="bg-red-100 text-red-600 px-1 rounded">-{stats.totalFine}</span>}
                    </div>
                </div>
            </TableCell>
        </TableRow>
    )
}

function renderShiftIcon(type: ShiftType) {
    switch (type) {
        case 'full': return <CheckSquare className="w-7 h-7 text-amber-600" />
        case 'half': return <div className="font-bold text-amber-500 text-xl">½</div>
        case 'none': return <X className="w-6 h-6 text-red-400" />
        default: return <Square className="w-7 h-7 text-stone-200" />
    }
}

function ShiftFinancePopover({ shift, onUpdate }: { shift: StaffShift, onUpdate: (u: any) => void }) {
    const [bonus, setBonus] = useState(shift.bonus)
    const [fine, setFine] = useState(shift.fine)
    const [isOpen, setIsOpen] = useState(false)

    const hasValues = shift.bonus > 0 || shift.fine > 0
    const colorClass = shift.bonus > 0 ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' :
        shift.fine > 0 ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' :
            'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className={`h-6 px-1.5 rounded-lg border transition-all shadow-sm font-bold flex items-center gap-1 ${colorClass}`}>
                    <Calculator className="w-3 h-3" />
                    <span className="text-[10px]">
                        {shift.bonus > 0 && `+${shift.bonus}`}
                        {shift.fine > 0 && ` -${shift.fine}`}
                        {!hasValues && "0"}
                    </span>
                    <span className="text-[10px]">₽</span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[300px]">
                <DialogHeader>
                    <DialogTitle className="text-sm">Премии и штрафы</DialogTitle>
                    <DialogDescription className="sr-only">
                        Добавление бонусов или вычетов к текущей смене.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Премия</Label>
                        <Input type="number" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Штраф</Label>
                        <Input type="number" value={fine} onChange={(e) => setFine(Number(e.target.value))} />
                    </div>
                </div>
                <DialogFooter>
                    <Button size="sm" onClick={() => {
                        onUpdate({ bonus, fine })
                        setIsOpen(false)
                    }}>Сохранить</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function StaffForm({ roles, onSuccess, onSubmit, member }: any) {
    const [name, setName] = useState(member?.name || '')
    const [roleId, setRoleId] = useState(member?.role_id || '')
    const [rate, setRate] = useState(member?.base_rate?.toString() || '2500')
    const [email, setEmail] = useState(member?.email || '')
    const [phone, setPhone] = useState(member?.phone || '')
    const [notes, setNotes] = useState(member?.notes || '')

    const handleSubmit = async () => {
        if (!name || !roleId) return
        await onSubmit({
            name,
            role_id: roleId,
            base_rate: Number(rate),
            email: email || undefined,
            phone: phone || undefined,
            notes: notes || undefined,
            is_active: member ? member.is_active : true
        })
        onSuccess()
    }

    return (
        <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>ФИО сотрудника</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Иванов" />
                </div>
                <div className="space-y-2">
                    <Label>Роль</Label>
                    <Select onValueChange={setRoleId} defaultValue={roleId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map((r: StaffRole) => (
                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Телефон</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 000-00-00" />
                </div>
                <div className="space-y-2">
                    <Label>Ставка за смену (₽)</Label>
                    <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Email (для доступа к ЗП)</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com" />
            </div>
            <div className="space-y-2">
                <Label>Заметки / Комментарии</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Доп. информация" />
            </div>
            <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={handleSubmit}>
                {member ? 'Сохранить изменения' : 'Добавить'}
            </Button>
        </div>
    )
}

function SortableRoleItem({ role, onUpdate }: { role: StaffRole, onUpdate: (id: string, updates: Partial<StaffRole>) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: role.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex gap-2 items-center bg-white p-1 rounded-md border border-stone-100 shadow-sm">
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-stone-300 hover:text-stone-500 transition-colors">
                <GripVertical className="w-4 h-4" />
            </button>
            <Input
                className="h-8 text-sm"
                defaultValue={role.name}
                onBlur={(e) => {
                    if (e.target.value !== role.name) {
                        onUpdate(role.id, { name: e.target.value })
                    }
                }}
            />
        </div>
    );
}

function RolesManageDialog({ roles, onSuccess, createRole, updateRole }: any) {
    const [newRoleName, setNewRoleName] = useState('')
    const [newRoleDept, setNewRoleDept] = useState<'hall' | 'kitchen'>('hall')

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAdd = async () => {
        if (!newRoleName) return
        const rolesInDept = roles.filter((r: StaffRole) => (r.department || 'hall') === newRoleDept)
        const maxOrder = rolesInDept.reduce((max: number, r: StaffRole) => Math.max(max, r.sort_order || 0), 0)

        await createRole({
            name: newRoleName,
            department: newRoleDept,
            sort_order: maxOrder + 1
        })
        setNewRoleName('')
        onSuccess()
    }

    const handleUpdate = async (id: string, updates: Partial<StaffRole>) => {
        await updateRole(id, updates)
        onSuccess()
    }

    const handleDragEnd = async (event: DragEndEvent, dept: 'hall' | 'kitchen') => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const deptRoles = roles.filter((r: StaffRole) => (r.department || 'hall') === dept)
                .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

            const oldIndex = deptRoles.findIndex((r: any) => r.id === active.id);
            const newIndex = deptRoles.findIndex((r: any) => r.id === over.id);

            const newOrderedRoles = arrayMove(deptRoles, oldIndex, newIndex);

            // Пакетное обновление порядковых номеров
            for (let i = 0; i < newOrderedRoles.length; i++) {
                if (newOrderedRoles[i].sort_order !== i + 1) {
                    await updateRole(newOrderedRoles[i].id, { sort_order: i + 1 });
                }
            }
            onSuccess();
        }
    };

    const departments: ('hall' | 'kitchen')[] = ['hall', 'kitchen'];

    return (
        <div className="space-y-8 py-4 px-1 max-h-[70vh] overflow-y-auto">
            {departments.map(dept => {
                const deptRoles = roles.filter((r: StaffRole) => (r.department || 'hall') === dept)
                    .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

                return (
                    <div key={dept} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                            <Label className="text-stone-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                                {dept === 'hall' ? <Users className="w-3 h-3" /> : <ChefHat className="w-3 h-3" />}
                                {dept === 'hall' ? 'Зал' : 'Кухня'}
                            </Label>
                            <span className="text-[10px] text-stone-300 font-medium">{deptRoles.length} кат.</span>
                        </div>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, dept)}
                        >
                            <SortableContext
                                items={deptRoles.map((r: any) => r.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2">
                                    {deptRoles.map((role: StaffRole) => (
                                        <SortableRoleItem key={role.id} role={role} onUpdate={handleUpdate} />
                                    ))}
                                    {deptRoles.length === 0 && (
                                        <div className="text-center py-4 border border-dashed border-stone-200 rounded-lg text-[10px] text-stone-400">
                                            Нет категорий в этом отделе
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                );
            })}

            <div className="pt-6 border-t border-stone-100 space-y-3">
                <Label className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Добавить категорию</Label>
                <div className="flex gap-2">
                    <Input
                        className="h-9"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="Название"
                    />
                    <Select value={newRoleDept} onValueChange={(val) => setNewRoleDept(val as any)}>
                        <SelectTrigger className="w-[110px] h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hall">Зал</SelectItem>
                            <SelectItem value="kitchen">Кухня</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button size="sm" className="h-9 px-3 bg-amber-600 hover:bg-amber-700 shadow-sm" onClick={handleAdd}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

function HealthBooksView({ healthBooks, staff, refetch, isDirectorOrAdmin }: any) {
    const { mutate: createHealthBook } = useCreateMutation<HealthBook>('health_books')
    const { mutate: updateHealthBook } = useUpdateMutation<HealthBook>('health_books')
    const { mutate: deleteHealthBook } = useDeleteMutation('health_books')

    const [isAddOpen, setIsAddOpen] = useState(false)
    const [selectedStaffId, setSelectedStaffId] = useState('')
    const [issuedAt, setIssuedAt] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [expiresAt, setExpiresAt] = useState(format(addWeeks(new Date(), 52), 'yyyy-MM-dd'))
    const [notes, setNotes] = useState('')

    const handleAdd = async () => {
        if (!selectedStaffId) return
        await createHealthBook({
            staff_id: selectedStaffId,
            issued_at: issuedAt,
            expires_at: expiresAt,
            notes
        })
        setIsAddOpen(false)
        refetch()
    }

    const getStatus = (expiryDate: string) => {
        const today = new Date()
        const expiry = new Date(expiryDate)
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return { label: 'Истекла', color: 'bg-red-100 text-red-700', icon: AlertCircle }
        if (diffDays < 30) return { label: 'Истекает скоро', color: 'bg-amber-100 text-amber-700', icon: AlertCircle }
        return { label: 'Действительна', color: 'bg-green-100 text-green-700', icon: CheckSquare }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-stone-800">Учет медицинских книжек</h3>
                {isDirectorOrAdmin && (
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
                                <Plus className="w-4 h-4" />
                                Добавить запись
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Новая медкнижка</DialogTitle>
                                <DialogDescription>
                                    Укажите сроки действия медицинской книжки сотрудника.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Сотрудник</Label>
                                    <Select onValueChange={setSelectedStaffId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Выберите сотрудника" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staff.map((s: StaffMember) => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Дата выдачи</Label>
                                        <Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Дата истечения</Label>
                                        <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Заметки</Label>
                                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Номер книжки или доп. сведения" />
                                </div>
                                <Button className="w-full bg-amber-600" onClick={handleAdd}>Сохранить</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card className="border-stone-200 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-stone-50/50">
                            <TableHead className="pl-6">Сотрудник</TableHead>
                            <TableHead>Дата выдачи</TableHead>
                            <TableHead>Дата истечения</TableHead>
                            <TableHead>Статус</TableHead>
                            <TableHead>Заметки</TableHead>
                            {isDirectorOrAdmin && <TableHead className="w-[80px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {healthBooks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isDirectorOrAdmin ? 6 : 5} className="text-center py-10 text-stone-400">
                                    Нет записей о медкнижках
                                </TableCell>
                            </TableRow>
                        ) : (
                            healthBooks.map((hb: HealthBook) => {
                                const status = getStatus(hb.expires_at)
                                return (
                                    <TableRow key={hb.id} className="hover:bg-stone-50/50">
                                        <TableCell className="font-medium pl-6">{hb.staff?.name || 'Уволен'}</TableCell>
                                        <TableCell>{hb.issued_at ? format(parseISO(hb.issued_at), 'dd.MM.yyyy') : '-'}</TableCell>
                                        <TableCell className="font-semibold">{format(parseISO(hb.expires_at), 'dd.MM.yyyy')}</TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                                <status.icon className="w-3 h-3" />
                                                {status.label}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-stone-500 text-xs">{hb.notes || '-'}</TableCell>
                                        {isDirectorOrAdmin && (
                                            <TableCell className="pr-6 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-300 hover:text-red-500" onClick={async () => {
                                                    if (confirm('Удалить эту запись?')) {
                                                        await deleteHealthBook(hb.id)
                                                        refetch()
                                                    }
                                                }}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
