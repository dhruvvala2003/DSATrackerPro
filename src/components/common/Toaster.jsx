import { useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { getToasts, subscribeToasts, toast } from '../../lib/toast'

const STYLES = {
  success: { icon: CheckCircle2, accent: 'text-emerald-500' },
  error: { icon: AlertCircle, accent: 'text-rose-500' },
  warning: { icon: AlertTriangle, accent: 'text-amber-500' },
  info: { icon: Info, accent: 'text-indigo-500' },
}

export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts)

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 items-stretch sm:items-end pointer-events-none" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const { icon: Icon, accent } = STYLES[t.type] || STYLES.info
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15 } }}
              className="pointer-events-auto w-full sm:w-[380px] flex items-start gap-3 rounded-2xl bg-white/95 backdrop-blur border border-slate-200 shadow-xl shadow-slate-900/10 px-4 py-3"
              role={t.type === 'error' ? 'alert' : 'status'}
            >
              <Icon size={18} className={`${accent} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{t.message}</p>
                {t.description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.description}</p>}
                {t.action && (
                  <button
                    onClick={() => { t.action.onClick(); toast.dismiss(t.id) }}
                    className="mt-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="shrink-0 w-6 h-6 -mr-1 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
