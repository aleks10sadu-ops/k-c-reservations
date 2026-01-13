"use client"

import { motion } from 'framer-motion'
import { User, Mail, Shield, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth, UserRole } from '@/hooks/use-auth'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function ProfilePage() {
    const { user, role, isLoading } = useAuth()

    if (isLoading) return null
    if (!user) return null

    const getRoleBadge = (role: UserRole | null) => {
        switch (role) {
            case 'director': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">Управляющий</Badge>
            case 'admin': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Администратор</Badge>
            case 'waiter': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">Официант</Badge>
            case 'guest': return <Badge className="bg-stone-100 text-stone-600 hover:bg-stone-100 border-0">Гость</Badge>
            default: return <Badge variant="outline">Пользователь</Badge>
        }
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-stone-900">Профиль</h1>
                <p className="text-stone-500 mt-1">Информация о вашем аккаунте и правах доступа</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="md:col-span-1 border-stone-200 shadow-sm">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mb-4 border-4 border-white shadow-inner">
                            <User className="w-12 h-12 text-amber-600" />
                        </div>
                        <CardTitle className="text-xl truncate">{user.email?.split('@')[0]}</CardTitle>
                        <div className="mt-2 flex justify-center">
                            {getRoleBadge(role)}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4 border-t border-stone-100">
                        <div className="flex items-center gap-3 text-sm text-stone-600">
                            <Mail className="w-4 h-4 text-stone-400" />
                            <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-stone-600">
                            <Clock className="w-4 h-4 text-stone-400" />
                            <span>В системе с {format(new Date(user.created_at), 'MMMM yyyy', { locale: ru })}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-stone-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="w-5 h-5 text-amber-500" />
                            Статус доступа
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {role === 'guest' ? (
                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                                <h3 className="text-amber-900 font-semibold mb-2">Ожидание активации</h3>
                                <p className="text-amber-800 text-sm leading-relaxed">
                                    Ваш аккаунт зарегистрирован в системе с ролью <strong>Гость</strong>.
                                    Для получения доступа к функциям администратора, официанта или управляющего,
                                    обратитесь к владельцу базы данных.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-stone-600 text-sm">
                                    Вам назначена роль <strong>{role === 'director' ? 'Управляющий' : role === 'admin' ? 'Администратор' : 'Официант'}</strong>.
                                    Вам доступны следующие разделы:
                                </p>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {role === 'director' && (
                                        <li className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            Журнал аудита и откат действий
                                        </li>
                                    )}
                                    {(role === 'admin' || role === 'director') && (
                                        <>
                                            <li className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                Управление бронированиями
                                            </li>
                                            <li className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                Редактирование меню и залов
                                            </li>
                                        </>
                                    )}
                                    {(role === 'waiter' || role === 'admin' || role === 'director') && (
                                        <>
                                            <li className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                Расстановка позиций
                                            </li>
                                            <li className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                Учет зарплаты и персонала
                                            </li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
