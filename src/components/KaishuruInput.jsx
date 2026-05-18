import { Input } from './ui/input'
import { cn } from '@/lib/utils'

export default function KaishuruInput({
  className,
  error,
  helperText,
  ...props
}) {
  const message = error || helperText
  const hasError = Boolean(error)

  return (
    <div className="grid gap-1.5">
      <Input
        aria-invalid={hasError}
        className={cn(
          'min-h-12 rounded-2xl border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 shadow-sm',
          'placeholder:text-slate-400 placeholder:opacity-100',
          'focus-visible:border-sky-400 focus-visible:ring-4 focus-visible:ring-sky-100',
          'disabled:bg-slate-50 disabled:text-slate-400',
          hasError && 'border-rose-300 text-slate-900 focus-visible:border-rose-400 focus-visible:ring-rose-100',
          className
        )}
        {...props}
      />
      {message && (
        <p className={cn('px-1 text-xs font-semibold', hasError ? 'text-rose-600' : 'text-slate-500')}>
          {message}
        </p>
      )}
    </div>
  )
}
