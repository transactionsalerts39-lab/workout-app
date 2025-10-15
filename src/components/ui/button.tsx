import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-primary text-white shadow-soft hover:-translate-y-0.5 hover:shadow-[0_26px_70px_rgba(95,75,255,0.45)] focus-visible:ring-brand-200',
        secondary:
          'border border-white/10 bg-white/10 text-neutral-50 backdrop-blur-18 hover:bg-white/20 hover:border-white/20',
        outline:
          'border border-white/25 bg-transparent text-neutral-100 hover:border-accent-teal hover:text-accent-teal focus-visible:ring-accent-teal/40',
        ghost: 'text-neutral-300 hover:bg-white/10 hover:text-white',
        destructive:
          'bg-danger text-white shadow-soft hover:bg-danger/90 focus-visible:ring-danger/30',
        light: 'bg-neutral-100/90 text-neutral-900 hover:bg-neutral-100 focus-visible:ring-brand-200 focus-visible:ring-offset-neutral-100',
        link: 'text-white underline-offset-4 hover:text-accent-teal hover:underline',
      },
      size: {
        default: 'px-5 py-2.5',
        sm: 'px-4 py-2 text-xs',
        lg: 'px-6 py-3 text-base',
        icon: 'h-10 w-10 rounded-full p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  },
)

Button.displayName = 'Button'
