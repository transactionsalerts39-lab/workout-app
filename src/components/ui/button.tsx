import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        secondary:
          'bg-slate-900/5 text-slate-700 hover:bg-slate-900/10 hover:text-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        outline:
          'border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        ghost: 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900',
        destructive:
          'bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-500 focus-visible:ring-rose-200',
        link: 'text-indigo-600 underline-offset-4 hover:underline',
        subtle: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
      },
      size: {
        default: 'px-4 py-2',
        sm: 'px-3 py-1.5 text-sm',
        lg: 'px-5 py-2.5 text-base',
        icon: 'h-9 w-9 rounded-full p-0',
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

