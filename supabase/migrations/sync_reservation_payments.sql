-- Sync reservations.prepaid_amount with the sum of payments
-- Also auto-update reservation status to 'paid' if fully covered

-- 1. Ensure the column exists
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS prepaid_amount NUMERIC DEFAULT 0;

-- 2. Function to recalculate prepaid_amount and status
CREATE OR REPLACE FUNCTION sync_reservation_payment_data()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC;
    v_total_due NUMERIC;
    v_reservation_id UUID;
    v_current_status TEXT;
BEGIN
    -- Determine which reservation to update
    v_reservation_id := COALESCE(NEW.reservation_id, OLD.reservation_id);

    -- Get sum of all payments for this reservation
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM payments
    WHERE reservation_id = v_reservation_id;

    -- Get current reservation data
    SELECT total_amount, status::text
    INTO v_total_due, v_current_status
    FROM reservations
    WHERE id = v_reservation_id;

    -- Update reservation
    -- Using direct string values to avoid type mismatch issues
    UPDATE reservations
    SET 
        prepaid_amount = v_total_paid,
        status = CASE 
            WHEN v_total_paid >= v_total_due AND v_total_due > 0 THEN 'paid'
            WHEN v_total_paid > 0 AND v_current_status = 'new' THEN 'prepaid'
            ELSE status
        END
    WHERE id = v_reservation_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger
DROP TRIGGER IF EXISTS trg_sync_reservation_payments ON payments;
CREATE TRIGGER trg_sync_reservation_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION sync_reservation_payment_data();

-- 4. Initial sync for existing data
UPDATE reservations r
SET prepaid_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM payments p
    WHERE p.reservation_id = r.id
);
