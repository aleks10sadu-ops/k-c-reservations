'use client'

import { useEffect } from 'react'

export function PrintAutoStart() {
    useEffect(() => {
        // Ждем немного чтобы всё отрисовалось и шрифты загрузились
        const timer = setTimeout(() => {
            window.print()
        }, 800)
        return () => clearTimeout(timer)
    }, [])

    return null
}
