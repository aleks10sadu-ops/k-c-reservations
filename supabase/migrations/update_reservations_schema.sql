-- Add customization fields to reservation_menu_items
ALTER TABLE reservation_menu_items ADD COLUMN IF NOT EXISTS weight_per_person INTEGER;
ALTER TABLE reservation_menu_items ADD COLUMN IF NOT EXISTS name VARCHAR(200);
ALTER TABLE reservation_menu_items ADD COLUMN IF NOT EXISTS order_index INTEGER;
ALTER TABLE reservation_menu_items ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE reservation_menu_items ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE reservation_menu_items ALTER COLUMN menu_item_id DROP NOT NULL;

-- Remove the unique constraint to allow multiple ad-hoc items (without menu_item_id)
-- Or just to give more flexibility to the user
ALTER TABLE reservation_menu_items DROP CONSTRAINT IF EXISTS reservation_menu_items_res_menu_unique;
ALTER TABLE reservation_menu_items DROP CONSTRAINT IF EXISTS reservation_menu_items_reservation_id_menu_item_id_key;

-- Add balance and surplus to reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS surplus DECIMAL(12,2) DEFAULT 0;

-- Update trigger function to calculate balance and surplus
CREATE OR REPLACE FUNCTION sync_reservation_payment_data()
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
    FROM payments
    WHERE reservation_id = v_reservation_id;

    -- Get current reservation data
    SELECT total_amount, status::text
    INTO v_total_due, v_current_status
    FROM reservations
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
    UPDATE reservations
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
$$ LANGUAGE plpgsql;

-- Initial sync for existing data
UPDATE reservations r
SET 
    prepaid_amount = p.total_paid,
    balance = CASE WHEN p.total_paid > r.total_amount THEN 0 ELSE r.total_amount - p.total_paid END,
    surplus = CASE WHEN p.total_paid > r.total_amount THEN p.total_paid - r.total_amount ELSE 0 END
FROM (
    SELECT reservation_id, COALESCE(SUM(amount), 0) as total_paid
    FROM payments
    GROUP BY reservation_id
) p
WHERE r.id = p.reservation_id;
