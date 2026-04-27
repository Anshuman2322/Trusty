import * as React from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'default' | 'secondary' | 'ghost' | 'outline'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  default: 'tw-bg-primary tw-text-primary-foreground hover:tw-opacity-90',
  secondary: 'tw-bg-secondary tw-text-secondary-foreground hover:tw-bg-muted',
  ghost: 'tw-bg-transparent tw-text-foreground hover:tw-bg-muted',
  outline: 'tw-border tw-border-border tw-bg-background tw-text-foreground hover:tw-bg-muted',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'tw-h-9 tw-px-4 tw-py-2',
  sm: 'tw-h-8 tw-rounded-md tw-px-3 tw-text-xs',
  lg: 'tw-h-10 tw-rounded-md tw-px-6',
  icon: 'tw-h-9 tw-w-9',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'tw-inline-flex tw-items-center tw-justify-center tw-gap-2 tw-whitespace-nowrap tw-rounded-md tw-text-sm tw-font-semibold tw-transition-colors focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring focus-visible:tw-ring-offset-2 disabled:tw-pointer-events-none disabled:tw-opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
