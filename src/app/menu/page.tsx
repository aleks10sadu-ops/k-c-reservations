"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/layout/PageTransition'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BanquetMenuManager } from '@/components/menu/BanquetMenuManager'
import { MainMenuManager } from '@/components/menu/MainMenuManager'

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState("banquet")

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-6">Управление меню</h1>

        <Tabs defaultValue="banquet" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-stone-100 p-1">
            <TabsTrigger value="banquet" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Банкетное меню
            </TabsTrigger>
            <TabsTrigger value="main" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Основное меню
            </TabsTrigger>
          </TabsList>

          <TabsContent value="banquet" className="focus-visible:outline-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <BanquetMenuManager />
            </motion.div>
          </TabsContent>

          <TabsContent value="main" className="focus-visible:outline-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <MainMenuManager />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  )
}
