# Client Site Integration Instructions

## Database Context
This project connects to the `k-c-reservations` Supabase instance.
Refer to `DATABASE_STRUCTURE.md` for the full schema.

## Feature: Hall Capacity & Availability
To check if a reservation can be accommodated, use the `get_hall_availability` RPC.

### 1. Check Availability
before creating a reservation:
```javascript
const { data, error } = await supabase.rpc('get_hall_availability', {
  p_hall_id: selectedHallId,
  p_date: selectedDate, // 'YYYY-MM-DD'
  p_time: selectedTime, // 'HH:MM'
  p_duration: '02:00'   // estimated duration
});
```
The response includes `remaining_capacity` and `is_available`.

### 2. Logic: Waitlist
If `requestedGuests > data.remaining_capacity`:
- **UI**: Display "Unfortunately, fully booked for this time."
- **Action**: Offer to join the **Waitlist**.
- **Implementation**: When creating the reservation, set `status` to `'waitlist'`.
  ```javascript
  await supabase.rpc('create_public_reservation', {
    p_phone: '...',
    p_first_name: '...',
    p_last_name: '...',
    p_date: '...',
    p_time: '...',
    p_guests_count: 5,
    p_hall_id: '...',
    p_status: 'waitlist' // Explicitly set status
  })
  ```
  *(Note: Update your creation logic to allow 'waitlist' status).*

## Feature: Banquet Halls
Banquet Halls (and their sub-rooms) require special handling.

### 1. Booking Restriction
**Rule**: Reservations for Banquet Halls cannot be made for the current day ("Day-to-day").
**Constraint**: Minimum **2 days** in advance.
- `if (reservationDate < today + 2 days) -> Block selection or Show Error`.

### 2. "Sub-Halls" / Rooms
Banquet Halls are now divided into specific named rooms (e.g., "Hall 1 (30)", "Hall 2 (18)").
- These are stored in the `tables` table with `type = 'room'` and a `name` property.
- Fetch them: `SELECT * FROM tables WHERE hall_id = '...' AND type = 'room'`.
- Clients can select a specific room. Save its ID in `reservation.table_id`.
- **Integration**: Pass `p_table_id: selectedRoomId` to the `create_public_reservation` RPC.

## Statuses
- `'waitlist'`: New status for reservations waiting for a spot.
- `'new'`: Standard status for new web bookings.
- `'confirmed'`: Admin has seen/processed it.
