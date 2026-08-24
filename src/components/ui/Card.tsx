import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: CardProps) {
  return <div className={cn('px-6 py-5 border-b border-gray-100', className)}>{children}</div>
}

export function CardTitle({ className, children }: CardProps) {
  return <h3 className={cn('font-semibold text-gray-900', className)}>{children}</h3>
}

export function CardContent({ className, children }: CardProps) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}
