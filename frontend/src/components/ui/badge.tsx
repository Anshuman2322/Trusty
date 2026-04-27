import * as React from 'react'
import { cn } from '../../lib/cn'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'tw-bg-primary/10 tw-text-primary tw-border-primary/30',
  secondary: 'tw-bg-muted tw-text-muted-foreground tw-border-border',
  outline: 'tw-bg-background tw-text-foreground tw-border-border',
  destructive: 'tw-bg-destructive/10 tw-text-destructive tw-border-destructive/30',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'tw-inline-flex tw-items-center tw-rounded-md tw-border tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wide',
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  )
}
