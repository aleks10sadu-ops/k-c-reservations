"use client"

import { useState, useEffect } from "react"
import { Loader2, CreditCard, Banknote, ArrowRightLeft, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCreateMutation, useUpdateMutation } from "@/hooks/useSupabase"
import { createClient } from "@/lib/supabase/client"
import { Payment, Reservation, RESERVATION_STATUS_CONFIG } from "@/types"
import { formatDate, formatCurrency } from "@/lib/utils"
import { ReservationCombobox } from "@/components/reservations/ReservationCombobox"

interface AddPaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    reservationId?: string // If provided, locks the selection
    reservation?: Reservation // Direct reservation data if available (e.g. from modal)
    availableReservations?: Reservation[] // For selection if reservationId not provided
    onSuccess?: () => void
}

export function AddPaymentDialog({
    open,
    onOpenChange,
    reservationId,
    reservation,
    availableReservations = [],
    onSuccess
}: AddPaymentDialogProps) {
    const [selectedReservationId, setSelectedReservationId] = useState(reservationId || '')
    const [amount, setAmount] = useState<number>(0)
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('card')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    // Update selected if prop changes
    useEffect(() => {
        if (reservationId) {
            setSelectedReservationId(reservationId)
        }
    }, [reservationId])

    const updateReservation = useUpdateMutation<Reservation>('reservations')

    const selectedReservation = reservation || availableReservations.find(r => r.id === selectedReservationId)
    const remainingToPay = selectedReservation
        ? Math.max(0, selectedReservation.total_amount - (selectedReservation.prepaid_amount || 0))
        : 0
    const isOverpaid = amount > remainingToPay && remainingToPay > 0
    const overpaidAmount = amount - remainingToPay

    const handleAddPayment = async () => {
        if (!selectedReservationId || !amount) return

        // Create payment
        let result: Payment | null = null
        try {
            setLoading(true)
            const supabase = createClient()

            const payload = {
                reservation_id: selectedReservationId,
                amount: amount,
                payment_method: paymentMethod,
                payment_date: new Date().toISOString(),
                notes: notes || undefined
            }

            const { data, error } = await supabase
                .from('payments')
                .insert(payload)
                .select()
                .single()

            if (error) {
                console.error('SUPABASE ERROR:', error)
                alert(`Ошибка при создании оплаты: ${error.message}`)
                return
            }

            result = data // mimic compatibility with rest of function

            // Status update logic matches previous flow...
            // const { data: updatedReservation } = await supabase ... (existing logic below works with same supabase client)
        } catch (e) {
            console.error('Unexpected error during payment creation:', e)
            alert(`Произошла непредвиденная ошибка: ${e instanceof Error ? e.message : String(e)}`)
            return
        } finally {
            setLoading(false)
        }


        if (result) {
            // Status update logic
            // We need to fetch the LATEST reservation data to check totals
            const supabase = createClient()
            const { data: updatedReservation } = await supabase
                .from('reservations')
                .select('prepaid_amount, total_amount, status')
                .eq('id', selectedReservationId)
                .single()

            if (updatedReservation) {
                // If prepaid_amount became > 0 (was 0), set to prepaid
                // We can't easily check "was 0" without previous data, but logic is:
                // If status is 'new'/'in_progress' and now has money -> 'prepaid'
                // If fully paid -> 'paid'

                let newStatus = updatedReservation.status

                if (updatedReservation.prepaid_amount >= updatedReservation.total_amount) {
                    newStatus = 'paid'
                } else if (updatedReservation.prepaid_amount > 0 && (newStatus === 'new' || newStatus === 'in_progress')) {
                    newStatus = 'prepaid'
                }

                if (newStatus !== updatedReservation.status) {
                    await updateReservation.mutate(selectedReservationId, {
                        status: newStatus
                    })
                }
            }

            setAmount(0)
            setNotes('')
            setPaymentMethod('card')
            // Only clear ID if it wasn't fixed props
            if (!reservationId) setSelectedReservationId('')

            onOpenChange(false)
            if (onSuccess) onSuccess()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Добавить оплату</DialogTitle>
                    <DialogDescription>
                        Зафиксируйте новый платёж по бронированию
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!reservationId && (
                        <div>
                            <Label>Бронирование</Label>
                            <ReservationCombobox
                                reservations={availableReservations}
                                value={selectedReservationId}
                                onChange={setSelectedReservationId}
                            />
                        </div>
                    )}

                    <div>
                        <Label>Сумма (₽)</Label>
                        <Input
                            type="number"
                            placeholder="10000"
                            className="mt-1"
                            value={amount || ''}
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        />
                        {selectedReservationId && (
                            <div className="mt-1.5 flex justify-between items-center text-xs">
                                <span className="text-stone-500">
                                    Остаток к оплате: <span className="font-medium text-stone-700">{formatCurrency(remainingToPay)}</span>
                                </span>
                                {isOverpaid && (
                                    <span className="text-amber-600 font-medium flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Излишек: {formatCurrency(overpaidAmount)}
                                    </span>
                                )}
                            </div>
                        )}
                        {isOverpaid && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold">Внимание: Превышение суммы</p>
                                    <p>Вносимая сумма больше остатка. После оплаты бронирование будет помечено как полностью оплаченное, а остаток {formatCurrency(overpaidAmount)} зафиксируется в истории.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label>Способ оплаты</Label>
                        <Select
                            value={paymentMethod}
                            onValueChange={(v: any) => setPaymentMethod(v)}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">
                                    <div className="flex items-center gap-2">
                                        <Banknote className="h-4 w-4" />
                                        Наличные
                                    </div>
                                </SelectItem>
                                <SelectItem value="card">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Картой
                                    </div>
                                </SelectItem>
                                <SelectItem value="transfer">
                                    <div className="flex items-center gap-2">
                                        <ArrowRightLeft className="h-4 w-4" />
                                        Перевод
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Комментарий</Label>
                        <Textarea
                            placeholder="Например: Первый взнос"
                            className="mt-1"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Отмена
                    </Button>
                    <Button
                        onClick={handleAddPayment}
                        disabled={loading || !selectedReservationId || !amount}
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Добавить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
