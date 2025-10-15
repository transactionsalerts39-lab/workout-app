import * as React from 'react'

import { cn } from '../../lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-400/70 transition-all focus:border-accent-teal focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-teal/30 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
})

Input.displayName = 'Input'
