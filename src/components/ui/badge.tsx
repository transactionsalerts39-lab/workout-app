import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-white/20 bg-white/10 text-neutral-50',
        secondary: 'border-brand-200/30 bg-brand-500/15 text-brand-100',
        success: 'border-success/20 bg-success/15 text-success',
        warning: 'border-warning/20 bg-warning/15 text-warning',
        destructive: 'border-danger/30 bg-danger/15 text-danger',
        outline: 'border-white/30 bg-transparent text-white hover:border-white/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
