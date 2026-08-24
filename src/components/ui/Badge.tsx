import { cn } from '@/lib/utils'

type BadgeVariant = 'gray' | 'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'emerald'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-50 text-blue-700',
  yellow: 'bg-yellow-50 text-yellow-700',
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-700',
  emerald: 'bg-emerald-50 text-emerald-700',
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}

import { PROJECT_STATUS, type ProjectStatusKey } from '@/lib/constants'

export function StatusBadge({ status }: { status: ProjectStatusKey }) {
  const info = PROJECT_STATUS[status]
  return <Badge variant={info.color as BadgeVariant}>{info.label}</Badge>
}
