import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog'
import { cn } from '@/lib/utils'

const actionClasses = {
  default: 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]',
  danger: 'bg-[#dc2626] text-white hover:bg-[#b91c1c]',
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel = '実行する',
  cancelLabel = 'キャンセル',
  variant = 'default',
  onConfirm,
  disabled,
  loading,
  className,
}) {
  const actionClassName = actionClasses[variant] ?? actionClasses.default
  const actionDisabled = disabled || loading

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <AlertDialogTrigger asChild>
          {trigger}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent
        className={cn(
          'w-[calc(100%-32px)] max-w-[360px] gap-4 rounded-3xl bg-white p-5 text-slate-900 shadow-xl',
          className
        )}
      >
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle className="text-lg font-bold leading-snug text-slate-950">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-sm leading-6 text-slate-600">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="-mx-5 -mb-5 gap-2 rounded-b-3xl border-t border-slate-100 bg-slate-50 p-4">
          <AlertDialogCancel
            disabled={loading}
            className="min-h-11 rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-700 hover:bg-slate-100"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={actionDisabled}
            onClick={onConfirm}
            className={cn(
              'min-h-11 rounded-xl px-4 font-bold disabled:pointer-events-none disabled:opacity-50',
              actionClassName
            )}
          >
            {loading ? '実行中...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
