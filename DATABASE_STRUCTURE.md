# Database Structure Context

This file documents the structure of the Supabase database for the `k-c-reservations` project. It is intended to help agents and developers understand the data model.

> **Note to Agents:** When making changes to the database schema (migrations), please update this file to reflect the new structure.

## Overview
The database manages restaurant reservations, including guests, halls, tables, menus, staff, and shifts.

## Tables

### `admins`
System administrators.
- **Columns**:
  - `id` (uuid): PK
  - `email` (text): Unique
  - `role` (text): Default 'editor'
  - `created_at` (timestamptz): Default now()

### `audit_logs`
Logs of critical actions on tables.
- **Columns**:
  - `id` (uuid): PK
  - `table_name` (text)
  - `record_id` (uuid)
  - `action` (text): CHECK (INSERT, UPDATE, DELETE)
  - `old_data` (jsonb)
  - `new_data` (jsonb)
  - `changed_by` (uuid): FK -> `profiles.id`
  - `created_at` (timestamptz): Default now()

### `guests`
Customer information.
- **Columns**:
  - `id` (uuid): PK
  - `first_name` (varchar)
  - `last_name` (varchar)
  - `middle_name` (varchar)
  - `phone` (varchar): Unique
  - `email` (varchar)
  - `status` (varchar): Default 'regular'. CHECK (regular, frequent, vip, blacklist)
  - `notes` (text)
  - `total_visits` (int): Default 0
  - `total_spent` (numeric): Default 0
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `updated_by` (uuid): FK -> `auth.users.id`

### `halls`
Restaurant halls or dining areas.
- **Columns**:
  - `id` (uuid): PK
  - `name` (varchar)
  - `capacity` (int)
  - `description` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `tables`
Physical tables within a hall.
- **Columns**:
  - `id` (uuid): PK
  - `hall_id` (uuid): FK -> `halls.id`
  - `number` (int): Nullable if named
  - `name` (text): Custom name (e.g. "Banquet Room 1")
  - `type` (text): Default 'table'. Values: 'table', 'room'
  - `capacity` (int): Default 4
  - `position_x` (numeric)
  - `position_y` (numeric)
  - `width` (numeric)
  - `height` (numeric)
  - `shape` (varchar): Default 'rectangle'. CHECK (round, rectangle, square)
  - `rotation` (numeric): Default 0
  - `created_at` (timestamptz)

### `hall_date_layouts`
Specific table layouts for a hall on a specific date.
- **Columns**:
  - `id` (uuid): PK
  - `hall_id` (uuid): FK -> `halls.id`
  - `date` (date)
  - `tables_data` (jsonb): Array of table positions/states
  - `layout_items_data` (jsonb): Array of decorative items
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `hall_layout_templates`
Reusable layout templates for halls.
- **Columns**:
  - `id` (uuid): PK
  - `hall_id` (uuid): FK -> `halls.id`
  - `name` (varchar)
  - `tables_data` (jsonb)
  - `layout_items_data` (jsonb)
  - `is_standard` (boolean): Default false
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `layout_items`
Decorative or structural items in a hall layout (e.g., walls, plants).
- **Columns**:
  - `id` (uuid): PK
  - `hall_id` (uuid): FK -> `halls.id`
  - `type` (varchar): CHECK (label, shape)
  - `text` (text)
  - `position_x` (numeric)
  - `position_y` (numeric)
  - `width` (numeric)
  - `height` (numeric)
  - `rotation` (numeric)
  - `color` (varchar)
  - `bg_color` (varchar)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `reservations`
Main reservation records.
- **Columns**:
  - `id` (uuid): PK
  - `date` (date)
  - `time` (time)
  - `hall_id` (uuid): FK -> `halls.id`
  - `table_id` (uuid): FK -> `tables.id`
  - `guest_id` (uuid): FK -> `guests.id`
  - `guests_count` (int): Default 1
  - `children_count` (int): Default 0
  - `menu_id` (uuid): FK -> `menus.id`
  - `status` (varchar): Default 'new'. Values: new, confirmed, in_progress, paid, prepaid, canceled, completed, waitlist
  - `total_amount` (numeric): Default 0
  - `prepaid_amount` (numeric): Default 0
  - `comments` (text)
  - `created_by` (uuid)
  - `updated_by` (uuid): FK -> `auth.users.id`
  - `waiter_id` (uuid): FK -> `staff.id`
  - `color` (varchar)
  - `balance` (numeric)
  - `surplus` (numeric)
  - `menu_type` (varchar): CHECK (banquet, main_menu)
  - `is_walk_in` (boolean)
  - `created_via` (text): Default 'website'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `reservation_tables`
Many-to-many link between reservations and tables (for multi-table reservations).
- **Columns**:
  - `id` (uuid): PK
  - `reservation_id` (uuid): FK -> `reservations.id`
  - `table_id` (uuid): FK -> `tables.id`
  - `created_at` (timestamptz)

### `payments`
Payments linked to reservations.
- **Columns**:
  - `id` (uuid): PK
  - `reservation_id` (uuid): FK -> `reservations.id`
  - `amount` (numeric)
  - `payment_method` (text): Default 'card'
  - `payment_date` (timestamptz)
  - `notes` (text)
  - `created_by` (uuid): FK -> `auth.users`
  - `updated_by` (uuid): FK -> `auth.users`
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `reservation_settings`
Global settings for the reservation system.
- **Columns**:
  - `id` (uuid): PK
  - `key` (text): Unique
  - `value` (jsonb)
  - `updated_at` (timestamptz)

### `menus`
Banquet or set menus.
- **Columns**:
  - `id` (uuid): PK
  - `name` (varchar)
  - `price_per_person` (numeric)
  - `total_weight_per_person` (int)
  - `description` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `menu_item_types`
Categories/types within a specific menu.
- **Columns**:
  - `id` (uuid): PK
  - `menu_id` (uuid): FK -> `menus.id`
  - `name` (varchar)
  - `label` (varchar)
  - `label_plural` (varchar)
  - `order_index` (int)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `menu_items`
Individual items within a menu type.
- **Columns**:
  - `id` (uuid): PK
  - `menu_id` (uuid): FK -> `menus.id`
  - `name` (varchar)
  - `type` (varchar)
  - `weight_per_person` (int)
  - `price` (numeric)
  - `description` (text)
  - `is_selectable` (boolean)
  - `max_selections` (int)
  - `order_index` (int)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `reservation_menu_items`
Selections made for a reservation from a set menu.
- **Columns**:
  - `id` (uuid): PK
  - `reservation_id` (uuid): FK -> `reservations.id`
  - `menu_item_id` (uuid): FK -> `menu_items.id`
  - `is_selected` (boolean)
  - `weight_per_person` (int)
  - `name` (varchar)
  - `price` (numeric)
  - `order_index` (int)
  - `created_at` (timestamptz)

### `main_menu_categories`
Categories for the main (a la carte) menu.
- **Columns**:
  - `id` (uuid): PK
  - `name` (varchar)
  - `note` (text)
  - `order_index` (int)
  - `created_at` (timestamptz)

### `main_menu_items`
Items in the main menu.
- **Columns**:
  - `id` (uuid): PK
  - `category_id` (uuid): FK -> `main_menu_categories.id`
  - `name` (varchar)
  - `description` (text)
  - `weight` (varchar)
  - `weight_grams` (int)
  - `price` (numeric)
  - `price_per_100g` (numeric)
  - `min_portion_grams` (int)
  - `has_variants` (boolean)
  - `order_index` (int)
  - `created_at` (timestamptz)

### `main_menu_item_variants`
Variants for main menu items (e.g., different sizes/flavors).
- **Columns**:
  - `id` (uuid): PK
  - `item_id` (uuid): FK -> `main_menu_items.id`
  - `name` (varchar)
  - `weight` (varchar)
  - `weight_grams` (int)
  - `price` (numeric)
  - `order_index` (int)
  - `created_at` (timestamptz)

### `reservation_main_menu_items`
A la carte items ordered for a reservation.
- **Columns**:
  - `id` (uuid): PK
  - `reservation_id` (uuid): FK -> `reservations.id`
  - `main_menu_item_id` (uuid): FK -> `main_menu_items.id`
  - `variant_id` (uuid): FK -> `main_menu_item_variants.id`
  - `custom_name` (varchar)
  - `quantity` (int)
  - `weight_grams` (int)
  - `unit_price` (numeric)
  - `total_price` (numeric)
  - `notes` (text)
  - `order_index` (int)
  - `created_at` (timestamptz)

### `staff`
Employees.
- **Columns**:
  - `id` (uuid): PK
  - `profile_id` (uuid): FK -> `profiles.id`
  - `role_id` (uuid): FK -> `staff_roles.id`
  - `name` (text)
  - `email` (text)
  - `phone` (text)
  - `base_rate` (numeric)
  - `is_active` (boolean)
  - `notes` (text)
  - `last_assigned_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `staff_roles`
Roles for staff members.
- **Columns**:
  - `id` (uuid): PK
  - `name` (text): Unique
  - `description` (text)
  - `department` (text): CHECK (hall, kitchen)
  - `sort_order` (int)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `staff_shifts`
Work shifts for staff.
- **Columns**:
  - `id` (uuid): PK
  - `staff_id` (uuid): FK -> `staff.id`
  - `date` (date)
  - `shift_type` (text): CHECK (full, half, none)
  - `override_rate` (numeric)
  - `bonus` (numeric)
  - `fine` (numeric)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `health_books`
Health record tracking for staff.
- **Columns**:
  - `id` (uuid): PK
  - `staff_id` (uuid): FK -> `staff.id`
  - `issued_at` (date)
  - `expires_at` (date)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `profiles`
User profiles, linked to Auth Users.
- **Columns**:
  - `id` (uuid): PK, FK -> `auth.users.id`
  - `email` (varchar): Unique
  - `full_name` (varchar)
  - `role` (user_role enum): Default 'guest'
  - `avatar_url` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

### `notifications`
System notifications.
- **Columns**:
  - `id` (uuid): PK
  - `type` (text)
  - `title` (text)
  - `message` (text)
  - `recipient_role_id` (uuid): FK -> `staff_roles.id`
  - `recipient_staff_id` (uuid): FK -> `staff.id`
  - `user_id` (uuid): FK -> `auth.users.id`
  - `link` (text)
  - `is_read` (boolean)
  - `data` (jsonb)
  - `created_at` (timestamptz)

## Key RPCs
- `get_hall_availability(p_hall_id uuid, p_date date, p_time time, p_duration interval)`
  - Returns: `hall_id`, `capacity`, `reserved_count`, `remaining_capacity`, `is_available`
  - Logic: Sums guests of active reservations (excluding 'waitlist', 'canceled') that overlap with the requested time window (default 2h).
