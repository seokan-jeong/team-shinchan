/**
 * avatar.tsx
 *
 * shadcn/ui-style Avatar component for agent emoji display.
 */
import * as React from 'react'
import { cn } from '../../lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

function Avatar({ className, size = 'md', ...props }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-7 h-7 text-lg',
    lg: 'w-9 h-9 text-xl',
  }

  return (
    <div
      data-slot="avatar"
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        'bg-[rgba(255,255,255,0.04)] border border-[var(--border)]',
        'flex-shrink-0 select-none',
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}

export { Avatar }
