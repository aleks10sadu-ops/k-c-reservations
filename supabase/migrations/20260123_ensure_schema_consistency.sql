-- Comprehensive fix for missing columns and schema updates
-- Combines changes from sync_reservation_payments.sql and update_reservations_schema.sql
-- Date: 2026-01-23

-- 1. Ensure 'prepaid_amount', 'balance', 'surplus' exist on reservations
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS prepaid_amount NUMERIC DEFAULT 0;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS surplus DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS created_via TEXT DEFAULT 'website';

-- 2. Update reservation_menu_items schema (Critical for menu saving)
ALTER TABLE public.reservation_menu_items ADD COLUMN IF NOT EXISTS weight_per_person INTEGER;
ALTER TABLE public.reservation_menu_items ADD COLUMN IF NOT EXISTS name VARCHAR(200);
ALTER TABLE public.reservation_menu_items ADD COLUMN IF NOT EXISTS order_index INTEGER;
ALTER TABLE public.reservation_menu_items ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE public.reservation_menu_items ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE public.reservation_menu_items ALTER COLUMN menu_item_id DROP NOT NULL;

-- 3. Relax constraints on reservation_menu_items to allow duplicate items/ad-hoc items
ALTER TABLE public.reservation_menu_items DROP CONSTRAINT IF EXISTS reservation_menu_items_res_menu_unique;
ALTER TABLE public.reservation_menu_items DROP CONSTRAINT IF EXISTS reservation_menu_items_reservation_id_menu_item_id_key;

-- 4. Re-apply the trigger function for finding balance/surplus/status
CREATE OR REPLACE FUNCTION public.sync_reservation_payment_data()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC;
    v_total_due NUMERIC;
    v_reservation_id UUID;
    v_current_status TEXT;
    v_balance NUMERIC;
    v_surplus NUMERIC;
BEGIN
    -- Determine which reservation to update
    v_reservation_id := COALESCE(NEW.reservation_id, OLD.reservation_id);

    -- Get sum of all payments for this reservation
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM public.payments
    WHERE reservation_id = v_reservation_id;

    -- Get current reservation data
    SELECT total_amount, status::text
    INTO v_total_due, v_current_status
    FROM public.reservations
    WHERE id = v_reservation_id;

    -- Calculate balance and surplus
    IF v_total_paid > v_total_due THEN
        v_surplus := v_total_paid - v_total_due;
        v_balance := 0;
    ELSE
        v_surplus := 0;
        v_balance := v_total_due - v_total_paid;
    END IF;

    -- Update reservation
    UPDATE public.reservations
    SET 
        prepaid_amount = v_total_paid,
        balance = v_balance,
        surplus = v_surplus,
        status = CASE 
            WHEN v_total_paid >= v_total_due AND v_total_due > 0 THEN 'paid'
            WHEN v_total_paid > 0 AND v_current_status = 'new' THEN 'prepaid'
            ELSE status
        END
    WHERE id = v_reservation_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Ensure trigger on payments exists
DROP TRIGGER IF EXISTS trg_sync_reservation_payments ON public.payments;
CREATE TRIGGER trg_sync_reservation_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_reservation_payment_data();

-- 6. Recalculate existing data (Safe update)
UPDATE public.reservations r
SET 
    prepaid_amount = p.total_paid,
    balance = CASE WHEN p.total_paid > r.total_amount THEN 0 ELSE r.total_amount - p.total_paid END,
    surplus = CASE WHEN p.total_paid > r.total_amount THEN p.total_paid - r.total_amount ELSE 0 END
FROM (
    SELECT reservation_id, COALESCE(SUM(amount), 0) as total_paid
    FROM public.payments
    GROUP BY reservation_id
) p
WHERE r.id = p.reservation_id;
