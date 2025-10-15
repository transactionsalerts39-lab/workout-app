import * as React from 'react'

import { cn } from '../../lib/utils'

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => {
  return (
    <label ref={ref} className={cn('text-xs font-semibold uppercase tracking-wide text-neutral-300', className)} {...props} />
  )
})

Label.displayName = 'Label'
