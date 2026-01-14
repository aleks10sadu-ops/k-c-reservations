// Журнал аудита
export interface AuditLog {
    id: string
    table_name: string
    record_id: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    old_data: any
    new_data: any
    changed_by: string
    created_at: string
    profiles?: {
        email: string
    }
}

// Конфигурация цветов для действий аудита
export const AUDIT_ACTION_CONFIG: Record<AuditLog['action'], {
    label: string
    color: string
    bgColor: string
    borderColor: string
    icon?: any
}> = {
    INSERT: {
        label: 'Создание',
        color: '#166534', // green-800
        bgColor: '#DCFCE7', // green-100
        borderColor: '#22C55E', // green-500
    },
    UPDATE: {
        label: 'Изменение',
        color: '#1E40AF', // blue-800
        bgColor: '#DBEAFE', // blue-100
        borderColor: '#3B82F6', // blue-500
    },
    DELETE: {
        label: 'Удаление',
        color: '#991B1B', // red-800
        bgColor: '#FEE2E2', // red-100
        borderColor: '#EF4444', // red-500
    }
}
