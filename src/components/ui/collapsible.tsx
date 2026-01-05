"use client"

import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
}

export function Collapsible({
  title,
  children,
  defaultOpen = false,
  className,
  headerClassName,
  contentClassName
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn("border border-stone-200 rounded-lg overflow-hidden", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 transition-colors",
          headerClassName
        )}
      >
        <span className="font-medium text-stone-900">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-stone-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-stone-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className={cn("px-4 pb-4", contentClassName)}>
          {children}
        </div>
      )}
    </div>
  )
}
