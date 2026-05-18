import { Card, CardContent } from './ui/card'
import { cn } from '@/lib/utils'

const cardVariants = {
  default: 'border-slate-200 bg-white shadow-sm',
  soft: 'border-slate-100 bg-slate-50 shadow-sm',
  info: 'border-sky-100 bg-sky-50 shadow-sm',
  success: 'border-emerald-100 bg-emerald-50 shadow-sm',
  warning: 'border-amber-100 bg-amber-50 shadow-sm',
  danger: 'border-rose-100 bg-rose-50 shadow-sm',
}

export default function KaishuruCard({
  children,
  className,
  variant = 'default',
}) {
  const variantClassName = cardVariants[variant] ?? cardVariants.default

  return (
    <Card
      className={cn(
        'rounded-3xl border shadow-sm',
        variantClassName,
        className
      )}
    >
      <CardContent className="grid gap-3 p-4 sm:p-5">
        {children}
      </CardContent>
    </Card>
  )
}
