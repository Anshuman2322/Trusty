import * as React from 'react'
import { cn } from '../../lib/cn'

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn('tw-rounded-lg tw-border tw-border-border tw-bg-card tw-text-card-foreground', className)} {...props} />
})

Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn('tw-flex tw-flex-col tw-space-y-1.5 tw-p-4', className)} {...props} />
})

CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => {
  return <h3 ref={ref} className={cn('tw-text-sm tw-font-semibold tw-leading-none tw-tracking-tight', className)} {...props} />
})

CardTitle.displayName = 'CardTitle'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn('tw-p-4 tw-pt-0', className)} {...props} />
})

CardContent.displayName = 'CardContent'
