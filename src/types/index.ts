// Статусы бронирования
export type ReservationStatus =
  | 'new'           // Новая бронь - Серый
  | 'in_progress'   // Взято в работу - Бежевый
  | 'prepaid'       // Предоплата внесена - Нежный голубой
  | 'paid'          // Полностью оплачено - Нежный зелёный
  | 'canceled'      // Отмена брони - Нежный красный
  | 'completed'     // Успешно - Приятный фиолетовый

// Статусы гостей
export type GuestStatus =
  | 'regular'       // Обычный гость
  | 'frequent'      // Постоянный гость
  | 'vip'           // VIP
  | 'blacklist'     // Чёрный список

// Типы блюд в меню (стандартные)
export type StandardMenuItemType =
  | 'appetizer'     // Закуски
  | 'salad'         // Салаты
  | 'set'           // Сеты
  | 'bread'         // Хлеб
  | 'hot'           // Горячее
  | 'dessert'       // Десерты
  | 'drink'         // Напитки

// Кастомный тип блюда (привязан к конкретному меню)
export interface CustomMenuItemType {
  id: string
  menu_id: string
  name: string
  label: string
  label_plural: string
  order_index: number
  created_at: string
  updated_at: string
}

// Тип блюда может быть стандартным или кастомным (по имени)
export type MenuItemType = StandardMenuItemType | string

// Зал
export interface Hall {
  id: string
  name: string
  capacity: number
  description?: string
  tables: Table[]
  created_at: string
  updated_at: string
}

// Стол
export interface Table {
  id: string
  hall_id: string
  number: number
  capacity: number
  position_x: number
  position_y: number
  width: number
  height: number
  shape: 'round' | 'rectangle' | 'square'
  rotation?: number
}

export type LayoutItemType = 'label' | 'shape'

export interface LayoutItem {
  id: string
  hall_id: string
  type: LayoutItemType
  text?: string
  position_x: number
  position_y: number
  width: number
  height: number
  rotation?: number
  color?: string
  bg_color?: string
  created_at: string
  updated_at: string
}

// Позиция меню
export interface MenuItem {
  id: string
  menu_id: string
  name: string
  type: MenuItemType  // Может быть стандартным типом или кастомным (строка)
  weight_per_person: number  // Грамовка на человека
  price?: number
  description?: string
  is_selectable: boolean     // Можно выбирать из нескольких
  max_selections?: number    // Сколько можно выбрать (для салатов 3 из 5)
  order_index: number
  created_at: string
  updated_at: string
}

// Меню (набор блюд)
export interface Menu {
  id: string
  name: string               // Например: "Меню Кучер 4500"
  price_per_person: number   // Цена на человека
  total_weight_per_person: number  // Общая грамовка на человека
  description?: string
  items: MenuItem[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// Выбранные позиции меню в бронировании
export interface ReservationMenuItem {
  id: string
  reservation_id: string
  menu_item_id?: string | null
  menu_item?: MenuItem | null
  is_selected: boolean       // Выбрано ли (для селективных позиций)
  // Overrides for customization
  name?: string
  weight_per_person?: number
  price?: number
  type?: MenuItemType
  order_index?: number
}

// Гость
export interface Guest {
  id: string
  first_name: string
  last_name: string
  middle_name?: string
  phone: string
  email?: string
  status: GuestStatus
  notes?: string
  total_visits: number
  total_spent: number
  created_at: string
  updated_at: string
}

// Предоплата
export interface Payment {
  id: string
  reservation_id: string
  amount: number
  payment_date: string
  payment_method: 'cash' | 'card' | 'transfer'
  notes?: string
  created_by?: string
  created_at: string
}

// Тип меню бронирования
export type ReservationMenuType = 'banquet' | 'main_menu'

// Категория основного меню
export interface MainMenuCategory {
  id: string
  name: string
  note?: string
  order_index: number
  items?: MainMenuItem[]
  created_at?: string
}

// Позиция основного меню
export interface MainMenuItem {
  id: string
  category_id: string
  category?: MainMenuCategory
  category_name?: string
  name: string
  description?: string
  weight?: string
  weight_grams?: number
  price?: number
  price_per_100g?: number
  min_portion_grams?: number
  has_variants: boolean
  variants?: MainMenuItemVariant[]
  order_index: number
  created_at?: string
}

// Вариант позиции (напр. Цезарь с курицей/креветками/лососем)
export interface MainMenuItemVariant {
  id: string
  item_id: string
  name: string
  weight?: string
  weight_grams?: number
  price?: number
  order_index: number
  created_at?: string
}

// Выбранная позиция из основного меню в бронировании
export interface ReservationMainMenuItem {
  id: string
  reservation_id: string
  main_menu_item_id?: string
  main_menu_item?: MainMenuItem
  variant_id?: string
  variant?: MainMenuItemVariant
  custom_name?: string
  quantity: number
  weight_grams?: number
  unit_price: number
  total_price: number
  notes?: string
  order_index: number
  created_at?: string
}

// Бронирование
export interface Reservation {
  id: string
  date: string
  time: string
  hall_id: string
  hall?: Hall
  table_id?: string
  table?: Table
  tables?: Table[]
  table_ids?: string[]
  guest_id: string
  guest?: Guest
  guests_count: number
  children_count: number
  menu_type: ReservationMenuType
  menu_id?: string
  menu?: Menu
  selected_menu_items: ReservationMenuItem[]
  main_menu_items?: ReservationMainMenuItem[]
  status: ReservationStatus
  color?: string
  total_amount: number
  prepaid_amount: number
  balance: number
  surplus: number
  payments: Payment[]
  comments?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// Пользователь (админ)
export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'staff'
  avatar_url?: string
  created_at: string
}

// Для календаря
export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  reservations: Reservation[]
}

// Персонал: Роли
export interface StaffRole {
  id: string
  name: string
  description?: string
  created_at?: string
}

// Персонал: Сотрудник
export interface StaffMember {
  id: string
  profile_id?: string
  role_id: string
  role?: StaffRole
  name: string
  email?: string
  base_rate: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// Персонал: Смена
export type ShiftType = 'full' | 'half' | 'none'

export interface StaffShift {
  id: string
  staff_id: string
  date: string
  shift_type: ShiftType
  override_rate?: number
  bonus: number
  fine: number
  notes?: string
  created_at?: string
  updated_at?: string
}

// Статусы бронирования с цветами
export const RESERVATION_STATUS_CONFIG: Record<ReservationStatus, {
  label: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  new: {
    label: 'Новая бронь',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  in_progress: {
    label: 'Взято в работу',
    color: '#92400E',
    bgColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  prepaid: {
    label: 'Предоплата внесена',
    color: '#1E40AF',
    bgColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  paid: {
    label: 'Полностью оплачено',
    color: '#166534',
    bgColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  canceled: {
    label: 'Отмена брони',
    color: '#B91C1C',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  completed: {
    label: 'Успешно',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
}

// Статусы гостей с метками
export const GUEST_STATUS_CONFIG: Record<GuestStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  regular: {
    label: 'Обычный',
    color: '#6B7280',
    bgColor: '#F3F4F6',
  },
  frequent: {
    label: 'Постоянный',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
  },
  vip: {
    label: 'VIP',
    color: '#B45309',
    bgColor: '#FEF3C7',
  },
  blacklist: {
    label: 'Чёрный список',
    color: '#DC2626',
    bgColor: '#FEE2E2',
  },
}

// Стандартные типы блюд с метками
export const STANDARD_MENU_ITEM_TYPE_CONFIG: Record<StandardMenuItemType, {
  label: string
  labelPlural: string
}> = {
  appetizer: { label: 'Закуска', labelPlural: 'Закуски' },
  salad: { label: 'Салат', labelPlural: 'Салаты' },
  set: { label: 'Сет', labelPlural: 'Сеты' },
  bread: { label: 'Хлеб', labelPlural: 'Хлеб' },
  hot: { label: 'Горячее', labelPlural: 'Горячее' },
  dessert: { label: 'Десерт', labelPlural: 'Десерты' },
  drink: { label: 'Напиток', labelPlural: 'Напитки' },
}

// Функция для получения метки типа блюда (поддерживает стандартные и кастомные)
export function getMenuItemTypeLabel(
  type: MenuItemType,
  customTypes?: CustomMenuItemType[],
  plural: boolean = false
): string {
  // Проверяем стандартные типы
  if (type in STANDARD_MENU_ITEM_TYPE_CONFIG) {
    const config = STANDARD_MENU_ITEM_TYPE_CONFIG[type as StandardMenuItemType]
    return plural ? config.labelPlural : config.label
  }

  // Проверяем кастомные типы
  if (customTypes) {
    const customType = customTypes.find(ct => ct.name === type)
    if (customType) {
      return plural ? customType.label_plural : customType.label
    }
  }

  // Если не найдено, возвращаем само значение
  return type
}


export * from './audit'
