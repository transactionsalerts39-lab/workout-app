import * as React from 'react'

import { cn } from '../../lib/utils'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-neutral-50 placeholder:text-neutral-400/70 transition focus:border-accent-teal focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-teal/30 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
})

Select.displayName = 'Select'
