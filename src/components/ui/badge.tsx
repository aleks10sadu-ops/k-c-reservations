import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-amber-600 text-white shadow",
        secondary:
          "border-transparent bg-stone-100 text-stone-900",
        destructive:
          "border-transparent bg-red-500 text-white shadow",
        outline: "text-stone-900 border-stone-200",
        new: "border-stone-300 bg-stone-100 text-stone-600",
        inProgress: "border-amber-200 bg-amber-50 text-amber-700",
        prepaid: "border-blue-200 bg-blue-50 text-blue-700",
        paid: "border-green-200 bg-green-50 text-green-700",
        vip: "border-amber-300 bg-amber-100 text-amber-800",
        frequent: "border-purple-200 bg-purple-50 text-purple-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

