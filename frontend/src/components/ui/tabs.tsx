import * as React from 'react'
import { cn } from '../../lib/cn'

interface TabsContextValue {
  value: string
  setValue: (next: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error('Tabs components must be used inside <Tabs>.')
  return ctx
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function Tabs({ className, value, defaultValue = '', onValueChange, children, ...props }: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue)
  const current = value !== undefined ? value : internal

  const setValue = React.useCallback(
    (next: string) => {
      if (value === undefined) setInternal(next)
      onValueChange?.(next)
    },
    [onValueChange, value],
  )

  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={cn('tw-w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="tablist"
      className={cn('tw-inline-flex tw-h-10 tw-items-center tw-justify-center tw-rounded-lg tw-bg-muted tw-p-1 tw-text-muted-foreground', className)}
      {...props}
    />
  )
})

TabsList.displayName = 'TabsList'

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(({ className, value, children, ...props }, ref) => {
  const { value: current, setValue } = useTabsContext()
  const active = current === value

  return (
    <button
      ref={ref}
      role="tab"
      type="button"
      aria-selected={active}
      onClick={() => setValue(value)}
      className={cn(
        'tw-inline-flex tw-items-center tw-justify-center tw-gap-1.5 tw-whitespace-nowrap tw-rounded-md tw-px-3 tw-py-1.5 tw-text-sm tw-font-medium tw-transition-all',
        active
          ? 'tw-bg-card tw-text-foreground tw-shadow-sm'
          : 'tw-text-muted-foreground hover:tw-text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})

TabsTrigger.displayName = 'TabsTrigger'

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(({ className, value, children, ...props }, ref) => {
  const { value: current } = useTabsContext()
  if (current !== value) return null

  return (
    <div ref={ref} role="tabpanel" className={cn('tw-mt-3 tw-outline-none', className)} {...props}>
      {children}
    </div>
  )
})

TabsContent.displayName = 'TabsContent'
