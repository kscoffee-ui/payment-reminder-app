import { Button } from './ui/button'
import { cn } from '@/lib/utils'

const variantClasses = {
  primary: 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]',
  secondary: 'bg-[#e5e7eb] text-[#334155] hover:bg-[#d1d5db]',
  danger: 'bg-[#dc2626] text-white hover:bg-[#b91c1c]',
  ghost: 'bg-transparent text-[#334155] hover:bg-[#f1f5f9]',
  line: 'bg-[#06c755] text-white hover:bg-[#05b34d]',
}

const sizeClasses = {
  default: 'min-h-12 px-4 py-2 text-sm',
  sm: 'min-h-9 px-3 py-1.5 text-sm',
  lg: 'min-h-[54px] px-4 py-2.5 text-base',
  icon: 'size-10 p-0',
}

export function KaishuruButton({
  children,
  type = 'button',
  onClick,
  disabled,
  className,
  variant = 'primary',
  size = 'default',
}) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant="default"
      size="default"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border border-transparent font-bold transition-colors',
        'disabled:pointer-events-none disabled:cursor-default disabled:opacity-50',
        variantClasses[variant] || variantClasses.primary,
        sizeClasses[size] || sizeClasses.default,
        className
      )}
    >
      {children}
    </Button>
  )
}
