import { Hall, Menu, MenuItem, Guest, Reservation, Payment, Table } from '@/types'

// Демо данные для разработки (пока Supabase не подключен)

export const mockHalls: Hall[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Основной зал',
    capacity: 80,
    description: 'Главный зал ресторана с панорамными окнами',
    tables: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'VIP зал',
    capacity: 20,
    description: 'Приватный зал для особых мероприятий',
    tables: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'Терраса',
    capacity: 40,
    description: 'Летняя терраса с видом на город',
    tables: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockTables: Table[] = [
  // Основной зал
  { id: 't1', hall_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', number: 1, capacity: 4, position_x: 50, position_y: 50, width: 80, height: 80, shape: 'round' },
  { id: 't2', hall_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', number: 2, capacity: 4, position_x: 180, position_y: 50, width: 80, height: 80, shape: 'round' },
  { id: 't3', hall_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', number: 3, capacity: 6, position_x: 310, position_y: 50, width: 120, height: 80, shape: 'rectangle' },
  { id: 't4', hall_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', number: 4, capacity: 8, position_x: 50, position_y: 180, width: 160, height: 80, shape: 'rectangle' },
  { id: 't5', hall_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', number: 5, capacity: 4, position_x: 260, position_y: 180, width: 80, height: 80, shape: 'square' },
  { id: 't6', hall_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', number: 6, capacity: 6, position_x: 50, position_y: 310, width: 120, height: 80, shape: 'rectangle' },
  { id: 't7', hall_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', number: 7, capacity: 4, position_x: 220, position_y: 310, width: 80, height: 80, shape: 'round' },
  { id: 't8', hall_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', number: 8, capacity: 8, position_x: 350, position_y: 310, width: 160, height: 80, shape: 'rectangle' },
  // VIP зал
  { id: 't9', hall_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', number: 1, capacity: 10, position_x: 100, position_y: 100, width: 200, height: 100, shape: 'rectangle' },
  { id: 't10', hall_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', number: 2, capacity: 10, position_x: 100, position_y: 250, width: 200, height: 100, shape: 'rectangle' },
  // Терраса
  { id: 't11', hall_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012', number: 1, capacity: 4, position_x: 50, position_y: 50, width: 80, height: 80, shape: 'round' },
  { id: 't12', hall_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012', number: 2, capacity: 4, position_x: 180, position_y: 50, width: 80, height: 80, shape: 'round' },
  { id: 't13', hall_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012', number: 3, capacity: 4, position_x: 310, position_y: 50, width: 80, height: 80, shape: 'round' },
  { id: 't14', hall_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012', number: 4, capacity: 6, position_x: 50, position_y: 180, width: 120, height: 80, shape: 'rectangle' },
  { id: 't15', hall_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012', number: 5, capacity: 6, position_x: 220, position_y: 180, width: 120, height: 80, shape: 'rectangle' },
]

// Добавляем столы к залам
mockHalls[0].tables = mockTables.filter(t => t.hall_id === mockHalls[0].id)
mockHalls[1].tables = mockTables.filter(t => t.hall_id === mockHalls[1].id)
mockHalls[2].tables = mockTables.filter(t => t.hall_id === mockHalls[2].id)

export const mockMenuItems: MenuItem[] = [
  // Закуски
  { id: 'mi1', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Сырная тарелка', type: 'appetizer', weight_per_person: 80, is_selectable: false, order_index: 1, created_at: '', updated_at: '' },
  { id: 'mi2', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Мясная нарезка', type: 'appetizer', weight_per_person: 100, is_selectable: false, order_index: 2, created_at: '', updated_at: '' },
  { id: 'mi3', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Овощная нарезка', type: 'appetizer', weight_per_person: 120, is_selectable: false, order_index: 3, created_at: '', updated_at: '' },
  { id: 'mi4', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Оливки и маслины', type: 'appetizer', weight_per_person: 50, is_selectable: false, order_index: 4, created_at: '', updated_at: '' },
  // Салаты (выбор 3 из 5)
  { id: 'mi5', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Цезарь с курицей', type: 'salad', weight_per_person: 180, is_selectable: true, max_selections: 3, order_index: 5, created_at: '', updated_at: '' },
  { id: 'mi6', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Греческий салат', type: 'salad', weight_per_person: 180, is_selectable: true, max_selections: 3, order_index: 6, created_at: '', updated_at: '' },
  { id: 'mi7', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Салат с тунцом', type: 'salad', weight_per_person: 180, is_selectable: true, max_selections: 3, order_index: 7, created_at: '', updated_at: '' },
  { id: 'mi8', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Оливье', type: 'salad', weight_per_person: 180, is_selectable: true, max_selections: 3, order_index: 8, created_at: '', updated_at: '' },
  { id: 'mi9', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Капрезе', type: 'salad', weight_per_person: 180, is_selectable: true, max_selections: 3, order_index: 9, created_at: '', updated_at: '' },
  // Сеты
  { id: 'mi10', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Сет роллов Филадельфия', type: 'set', weight_per_person: 250, is_selectable: false, order_index: 10, created_at: '', updated_at: '' },
  { id: 'mi11', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Сет нигири', type: 'set', weight_per_person: 200, is_selectable: false, order_index: 11, created_at: '', updated_at: '' },
  // Горячее
  { id: 'mi12', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Стейк рибай', type: 'hot', weight_per_person: 300, is_selectable: false, order_index: 12, created_at: '', updated_at: '' },
  { id: 'mi13', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Гарнир картофельный', type: 'hot', weight_per_person: 150, is_selectable: false, order_index: 13, created_at: '', updated_at: '' },
  // Хлеб
  { id: 'mi14', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Хлебная корзина', type: 'bread', weight_per_person: 100, is_selectable: false, order_index: 14, created_at: '', updated_at: '' },
  // Десерты
  { id: 'mi15', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Чизкейк', type: 'dessert', weight_per_person: 120, is_selectable: false, order_index: 15, created_at: '', updated_at: '' },
  // Напитки
  { id: 'mi16', menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc', name: 'Морс ягодный', type: 'drink', weight_per_person: 300, is_selectable: false, order_index: 16, created_at: '', updated_at: '' },
]

export const mockMenus: Menu[] = [
  {
    id: 'd4e5f6a7-b8c9-0123-def0-123456789abc',
    name: 'Меню Кучер',
    price_per_person: 4500,
    total_weight_per_person: 1340,
    description: 'Классическое банкетное меню ресторана',
    items: mockMenuItems.filter(i => i.menu_id === 'd4e5f6a7-b8c9-0123-def0-123456789abc'),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'e5f6a7b8-c9d0-1234-ef01-23456789abcd',
    name: 'Меню Конго',
    price_per_person: 5500,
    total_weight_per_person: 1580,
    description: 'Премиальное меню с расширенным выбором',
    items: [],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f6a7b8c9-d0e1-2345-f012-3456789abcde',
    name: 'Детское меню',
    price_per_person: 2500,
    total_weight_per_person: 850,
    description: 'Специальное меню для маленьких гостей',
    items: [],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockGuests: Guest[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    first_name: 'Иван',
    last_name: 'Петров',
    middle_name: 'Сергеевич',
    phone: '+380501234567',
    email: 'ivan@example.com',
    status: 'vip',
    notes: 'Предпочитает столик у окна',
    total_visits: 12,
    total_spent: 156000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    first_name: 'Мария',
    last_name: 'Сидорова',
    middle_name: 'Александровна',
    phone: '+380671234567',
    email: 'maria@example.com',
    status: 'frequent',
    notes: 'Аллергия на морепродукты',
    total_visits: 8,
    total_spent: 89000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    first_name: 'Алексей',
    last_name: 'Коваленко',
    phone: '+380931234567',
    email: 'alex@example.com',
    status: 'regular',
    total_visits: 2,
    total_spent: 18000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockPayments: Payment[] = [
  {
    id: 'p1',
    reservation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    amount: 20000,
    payment_date: new Date(Date.now() - 86400000 * 5).toISOString(),
    payment_method: 'card',
    notes: 'Первый взнос',
    created_at: new Date().toISOString(),
  },
  {
    id: 'p2',
    reservation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    amount: 25000,
    payment_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    payment_method: 'transfer',
    notes: 'Второй взнос',
    created_at: new Date().toISOString(),
  },
]

const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)

const dayAfterTomorrow = new Date()
dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)

const threeDaysLater = new Date()
threeDaysLater.setDate(threeDaysLater.getDate() + 3)

const today = new Date()

export const mockReservations: Reservation[] = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    date: tomorrow.toISOString().split('T')[0],
    time: '18:00',
    hall_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    hall: mockHalls[0],
    guest_id: '11111111-1111-1111-1111-111111111111',
    guest: mockGuests[0],
    guests_count: 20,
    children_count: 3,
    menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc',
    menu: mockMenus[0],
    selected_menu_items: [],
    status: 'prepaid',
    total_amount: 90000,
    prepaid_amount: 45000,
    payments: mockPayments,
    comments: 'День рождения, нужен торт',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    date: dayAfterTomorrow.toISOString().split('T')[0],
    time: '19:00',
    hall_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    hall: mockHalls[1],
    guest_id: '22222222-2222-2222-2222-222222222222',
    guest: mockGuests[1],
    guests_count: 15,
    children_count: 0,
    menu_id: 'e5f6a7b8-c9d0-1234-ef01-23456789abcd',
    menu: mockMenus[1],
    selected_menu_items: [],
    status: 'in_progress',
    total_amount: 82500,
    prepaid_amount: 0,
    payments: [],
    comments: 'Корпоратив',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    date: threeDaysLater.toISOString().split('T')[0],
    time: '17:00',
    hall_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    hall: mockHalls[2],
    guest_id: '33333333-3333-3333-3333-333333333333',
    guest: mockGuests[2],
    guests_count: 8,
    children_count: 2,
    menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc',
    menu: mockMenus[0],
    selected_menu_items: [],
    status: 'new',
    total_amount: 36000,
    prepaid_amount: 0,
    payments: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    date: today.toISOString().split('T')[0],
    time: '20:00',
    hall_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    hall: mockHalls[0],
    guest_id: '11111111-1111-1111-1111-111111111111',
    guest: mockGuests[0],
    guests_count: 10,
    children_count: 0,
    menu_id: 'd4e5f6a7-b8c9-0123-def0-123456789abc',
    menu: mockMenus[0],
    selected_menu_items: [],
    status: 'paid',
    total_amount: 45000,
    prepaid_amount: 45000,
    payments: [],
    comments: 'Деловой ужин',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

