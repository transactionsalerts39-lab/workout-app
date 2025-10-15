import * as React from 'react'

import { cn } from '../../lib/utils'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-50 placeholder:text-neutral-400/70 transition-all focus:border-accent-teal focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-teal/30 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
})

Textarea.displayName = 'Textarea'
