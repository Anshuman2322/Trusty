import * as React from 'react'
import { cn } from '../../lib/cn'

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  onValueChange?: (value: string) => void
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, onValueChange, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'tw-flex tw-h-9 tw-w-full tw-rounded-md tw-border tw-border-input tw-bg-background tw-px-3 tw-py-1 tw-text-sm tw-text-foreground tw-shadow-sm focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring disabled:tw-cursor-not-allowed disabled:tw-opacity-50',
        className,
      )}
      onChange={(event) => onValueChange?.(event.target.value)}
      {...props}
    >
      {children}
    </select>
  )
})

Select.displayName = 'Select'

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>
}
