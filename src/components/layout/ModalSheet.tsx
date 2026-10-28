import type { ReactNode, SubmitEvent } from 'react'
import { X, type LucideIcon } from 'lucide-react'

interface ModalSheetProps {
  title: string
  subtitle?: string
  ariaLabel?: string
  icon: LucideIcon
  closeLabel: string
  maxWidthClass?: string
  onClose: () => void
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
  children: ReactNode
}

export function ModalSheet({
  title,
  subtitle,
  ariaLabel,
  icon: Icon,
  closeLabel,
  maxWidthClass = 'max-w-lg',
  onClose,
  onSubmit,
  children,
}: ModalSheetProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-base/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
    >
      <form
        onSubmit={onSubmit}
        className={`w-full ${maxWidthClass} glass-panel rounded-t-3xl sm:rounded-3xl border border-line/30 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl`}
      >
        <div className="w-10 h-1 bg-line/40 rounded-full mx-auto mb-1 sm:hidden" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-ink truncate">{title}</h3>
              {subtitle && <p className="text-xs text-ink-muted truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="touch-target shrink-0 p-2 rounded-xl bg-surface/80 hover:bg-surface text-ink-muted hover:text-ink border border-line/20 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children}
      </form>
    </div>
  )
}

