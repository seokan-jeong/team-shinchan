/**
 * tabs.tsx
 *
 * shadcn/ui-style Tabs component built on @radix-ui/react-tabs.
 * Follows shadcn/ui patterns: forwardRef, cn utility, data-slot attributes.
 */
import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../lib/utils'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'flex items-center gap-0 flex-shrink-0 border-b border-[var(--border)] bg-[var(--card-bg)] px-5',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Base styles mirroring styles.css .tab
        'relative inline-flex items-center gap-1.5 select-none cursor-pointer',
        'bg-transparent border-0 border-b-2 border-transparent',
        'text-[var(--text-muted)] text-xs font-semibold tracking-tight',
        'px-4 py-2.5 mb-[-1px]',
        'transition-colors duration-200 outline-none',
        'hover:text-[var(--text)]',
        // Active state
        'data-[state=active]:text-[var(--primary)] data-[state=active]:border-b-[var(--primary)]',
        // Focus visible ring
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'flex-1 overflow-hidden flex flex-col',
        'data-[state=active]:animate-[fadeIn_0.2s_ease]',
        'data-[state=inactive]:hidden',
        'outline-none',
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
