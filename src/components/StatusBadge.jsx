import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'

const statusLabels = {
  unpaid: '未払い',
  reported: '確認待ち',
  confirmed: '確認済み',
}

const statusClasses = {
  unpaid: 'border-[#fecaca] bg-[#fff1f2] text-[#be123c]',
  reported: 'border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]',
  confirmed: 'border-[#bbf7d0] bg-[#ecfdf5] text-[#059669]',
}

export function StatusBadge({ status, className }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'status-badge border font-bold',
        statusClasses[status],
        className
      )}
    >
      {statusLabels[status]}
    </Badge>
  )
}
