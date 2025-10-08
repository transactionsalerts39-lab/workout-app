import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const Sheet = DialogPrimitive.Root

const SheetTrigger = DialogPrimitive.Trigger

const SheetClose = DialogPrimitive.Close

const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-sm', className)}
    {...props}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

const sheetContentVariants = cva(
  'fixed z-50 flex h-full flex-col rounded-t-3xl border border-slate-200 bg-white p-6 shadow-2xl transition ease-in-out sm:rounded-none',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 max-h-[75vh] translate-y-[-100%] data-[state=open]:translate-y-0',
        bottom: 'inset-x-0 bottom-0 max-h-[90vh] translate-y-[100%] data-[state=open]:translate-y-0',
        left: 'left-0 top-0 h-full w-full max-w-md translate-x-[-100%] data-[state=open]:translate-x-0 sm:rounded-r-3xl',
        right: 'right-0 top-0 h-full w-full max-w-md translate-x-[100%] data-[state=open]:translate-x-0 sm:rounded-l-3xl',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetContentVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side, className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetContentVariants({ side }), className)}
      {...props}
    >
      <div className="sticky top-0 flex items-center justify-end pb-4">
        <SheetClose className="text-sm text-slate-500 transition hover:text-slate-900">Close</SheetClose>
      </div>
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-6 pb-6">{children}</div>
      </div>
    </DialogPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = DialogPrimitive.Content.displayName

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-1', className)} {...props} />
)

const SheetTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-lg font-semibold text-slate-900', className)} {...props} />
  ),
)
SheetTitle.displayName = 'SheetTitle'

const SheetDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-slate-500', className)} {...props} />
  ),
)
SheetDescription.displayName = 'SheetDescription'

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-4 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-end', className)} {...props} />
)

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
}

