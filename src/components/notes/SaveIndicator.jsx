import { CircleAlert, CircleCheck, CloudOff, LoaderCircle } from 'lucide-react'

function timeLabel(date) {
  return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
}

export default function SaveIndicator({ status, lastSavedAt, error, onRetry }) {
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 h-8 pl-2.5 pr-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold" title={error?.message} role="alert">
        <CircleAlert size={14} />
        <span className="hidden sm:inline">Not saved — kept on this device</span>
        <span className="sm:hidden">Not saved</span>
        <button type="button" onClick={onRetry} className="h-6 px-2 rounded-md bg-white border border-rose-200 hover:bg-rose-100 transition-colors">
          Retry
        </button>
      </div>
    )
  }
  if (status === 'offline') {
    return (
      <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold" title="Your changes are stored in this browser and will save when you're back online.">
        <CloudOff size={14} /> Offline — saved on this device
      </div>
    )
  }
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 h-8 px-2.5 text-slate-500 text-xs font-semibold">
        <LoaderCircle size={14} className="animate-spin" /> Saving…
      </div>
    )
  }
  if (status === 'unsaved') {
    return (
      <div className="flex items-center gap-1.5 h-8 px-2.5 text-slate-400 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Editing…
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 h-8 px-2.5 text-emerald-600 text-xs font-semibold" title={lastSavedAt ? `Last saved at ${timeLabel(lastSavedAt)}` : 'All changes are saved'}>
      <CircleCheck size={14} /> Saved
    </div>
  )
}
