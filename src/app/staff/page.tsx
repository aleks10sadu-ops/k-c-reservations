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
    Settings
} from 'lucide-react'
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
    DialogFooter
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { useStaff, useStaffRoles, useStaffShifts, useCreateMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useSupabase'
import { StaffMember, StaffRole, StaffShift, ShiftType } from '@/types'
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

    // Hooks
    const { data: roles, refetch: refetchRoles } = useStaffRoles()
    const { data: staff, refetch: refetchStaff } = useStaff()

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
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Персонал</h1>
                    <p className="text-stone-500 mt-1">График работы, учет смен и зарплат</p>
                </div>
                <div className="flex items-center gap-2">
                    {isDirectorOrAdmin && (
                        <>
                            <Dialog open={isReportingOpen} onOpenChange={setIsReportingOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Download className="w-4 h-4" />
                                        Отчеты
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Выгрузка отчета в Excel</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <Button className="w-full justify-start" onClick={() => exportToExcel(startOfMonth(new Date()), endOfMonth(new Date()))}>
                                            За текущий месяц
                                        </Button>
                                        <Button className="w-full justify-start" onClick={() => exportToExcel(addDays(new Date(), -30), new Date())}>
                                            За последние 30 дней
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isRolesManageOpen} onOpenChange={setIsRolesManageOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Категории сотрудников</DialogTitle>
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
                                    <Button className="gap-2 bg-amber-600 hover:bg-amber-700">
                                        <Plus className="w-4 h-4" />
                                        Добавить сотрудника
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Новый сотрудник</DialogTitle>
                                    </DialogHeader>
                                    <AddStaffForm roles={roles || []} onSuccess={() => {
                                        setIsAddStaffOpen(false)
                                        refetchStaff()
                                    }} createStaff={createStaff} />
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </div>

            {/* Week Navigation */}
            <Card className="border-stone-200 bg-stone-50/50">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <div className="text-lg font-medium">
                            {format(weekDays[0], 'd MMMM', { locale: ru })} — {format(weekDays[6], 'd MMMM yyyy', { locale: ru })}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Сегодня</Button>
                </CardContent>
            </Card>

            {/* Staff Tables by Role */}
            <div className="space-y-8">
                {roles?.map(role => {
                    const roleStaff = filteredStaff.filter(s => s.role_id === role.id)
                    if (roleStaff.length === 0 && !isDirectorOrAdmin) return null

                    return (
                        <Card key={role.id} className="border-stone-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-stone-50/30 border-b">
                                <CardTitle className="text-lg">
                                    {role.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-stone-50/20">
                                            <TableHead className="w-[180px]">ФИО / Ставка</TableHead>
                                            {weekDays.map(day => (
                                                <TableHead key={day.toISOString()} className="text-center p-2">
                                                    <div className="text-xs text-stone-500 uppercase">{format(day, 'EEE', { locale: ru })}</div>
                                                    <div className={isSameDay(day, new Date()) ? "text-amber-600 font-bold" : ""}>{format(day, 'd.MM')}</div>
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-right pr-6">Итого</TableHead>
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
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

function StaffRow({ member, weekDays, getShift, toggleShift, isDirectorOrAdmin, updateStaffInfo, updateShiftFinance }: any) {
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
        <TableRow className="hover:bg-amber-50/20 transition-colors border-b">
            <TableCell className="font-medium p-4">
                <div className="flex flex-col">
                    <span>{member.name}</span>
                    {isDirectorOrAdmin ? (
                        <div className="flex items-center gap-1 group">
                            <Input
                                className="h-6 w-20 text-xs px-1 border-transparent hover:border-stone-200 focus:border-amber-300"
                                defaultValue={member.base_rate}
                                onBlur={(e) => updateStaffInfo(member.id, { base_rate: Number(e.target.value) })}
                            />
                            <span className="text-[10px] text-stone-400">₽/см</span>
                        </div>
                    ) : (
                        <span className="text-xs text-stone-500">{member.base_rate} ₽/см</span>
                    )}
                </div>
            </TableCell>

            {weekDays.map((day: Date) => {
                const shift = getShift(member.id, day)
                return (
                    <TableCell key={day.toISOString()} className="text-center p-1">
                        <div className="flex flex-col items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`w-10 h-10 transition-all ${isDirectorOrAdmin ? "hover:scale-110" : "cursor-default"}`}
                                onClick={() => toggleShift(member.id, day)}
                                disabled={!isDirectorOrAdmin}
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
                <div className="flex flex-col text-sm">
                    <span className="font-bold text-amber-900">{stats.totalPay.toLocaleString()} ₽</span>
                    <div className="text-[10px] text-stone-400">
                        {stats.full > 0 && `${stats.full}×1 `}
                        {stats.half > 0 && `${stats.half}×½ `}
                        {stats.totalBonus > 0 && <span className="text-green-600">+{stats.totalBonus} </span>}
                        {stats.totalFine > 0 && <span className="text-red-500">-{stats.totalFine} </span>}
                    </div>
                </div>
            </TableCell>
        </TableRow>
    )
}

function renderShiftIcon(type: ShiftType) {
    switch (type) {
        case 'full': return <CheckSquare className="w-6 h-6 text-amber-600" />
        case 'half': return <div className="font-bold text-amber-500 text-lg">½</div>
        case 'none': return <X className="w-5 h-5 text-stone-200" />
        default: return <Square className="w-6 h-6 text-stone-200" />
    }
}

function ShiftFinancePopover({ shift, onUpdate }: { shift: StaffShift, onUpdate: (u: any) => void }) {
    const [bonus, setBonus] = useState(shift.bonus)
    const [fine, setFine] = useState(shift.fine)
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="text-[9px] px-1 bg-stone-100 rounded hover:bg-stone-200 transition-colors text-stone-500">
                    {shift.bonus > 0 && `+${shift.bonus}`}
                    {shift.fine > 0 && ` -${shift.fine}`}
                    {shift.bonus === 0 && shift.fine === 0 && "₽"}
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[300px]">
                <DialogHeader>
                    <DialogTitle className="text-sm">Премии и штрафы</DialogTitle>
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

function AddStaffForm({ roles, onSuccess, createStaff }: any) {
    const [name, setName] = useState('')
    const [roleId, setRoleId] = useState('')
    const [rate, setRate] = useState('2500')
    const [email, setEmail] = useState('')

    const handleSubmit = async () => {
        if (!name || !roleId) return
        await createStaff({
            name,
            role_id: roleId,
            base_rate: Number(rate),
            email: email || undefined,
            is_active: true
        })
        onSuccess()
    }

    return (
        <div className="space-y-4 py-2">
            <div className="space-y-2">
                <Label>ФИО сотрудника</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Иванов" />
            </div>
            <div className="space-y-2">
                <Label>Роль</Label>
                <Select onValueChange={setRoleId}>
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
            <div className="space-y-2">
                <Label>Ставка за смену (₽)</Label>
                <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label>Email (для доступа к ЗП)</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com" />
            </div>
            <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={handleSubmit}>Добавить</Button>
        </div>
    )
}

function RolesManageDialog({ roles, onSuccess, createRole, updateRole }: any) {
    const [newRoleName, setNewRoleName] = useState('')

    const handleAdd = async () => {
        if (!newRoleName) return
        await createRole({ name: newRoleName })
        setNewRoleName('')
        onSuccess()
    }

    const handleUpdate = async (id: string, name: string) => {
        await updateRole(id, { name })
        onSuccess()
    }

    return (
        <div className="space-y-6 py-4">
            <div className="space-y-4">
                <Label>Существующие категории</Label>
                <div className="space-y-2">
                    {roles.map((role: StaffRole) => (
                        <div key={role.id} className="flex gap-2">
                            <Input
                                defaultValue={role.name}
                                onBlur={(e) => {
                                    if (e.target.value !== role.name) {
                                        handleUpdate(role.id, e.target.value)
                                    }
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t space-y-2">
                <Label>Добавить новую категорию</Label>
                <div className="flex gap-2">
                    <Input
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="Например: Хостес"
                    />
                    <Button onClick={handleAdd}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
