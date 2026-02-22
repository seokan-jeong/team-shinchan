/**
 * badge.tsx
 *
 * shadcn/ui-style Badge component using class-variance-authority.
 */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
    'text-[11px] font-semibold leading-none transition-colors',
    'border',
  ],
  {
    variants: {
      variant: {
        default:
          'bg-[rgba(88,166,255,0.12)] border-[rgba(88,166,255,0.3)] text-[var(--primary)]',
        success:
          'bg-[rgba(63,185,80,0.12)] border-[rgba(63,185,80,0.3)] text-[var(--success)]',
        warning:
          'bg-[rgba(210,153,34,0.12)] border-[rgba(210,153,34,0.3)] text-[var(--warning)]',
        destructive:
          'bg-[rgba(248,81,73,0.12)] border-[rgba(248,81,73,0.3)] text-[var(--destructive)]',
        outline:
          'bg-transparent border-[var(--border)] text-[var(--muted-foreground)]',
        muted:
          'bg-[rgba(255,255,255,0.05)] border-[var(--border)] text-[var(--muted-foreground)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
