// Tiny global toast store. Render <Toaster /> once; call toast.success('...') from anywhere.
let toasts = []
let nextId = 1
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

function show(message, { type = 'info', duration = 4500, description, action } = {}) {
  const id = nextId++
  toasts = [...toasts, { id, type, message, description, action }]
  emit()
  if (duration > 0) setTimeout(() => dismiss(id), duration)
  return id
}

function dismiss(id) {
  const next = toasts.filter((t) => t.id !== id)
  if (next.length !== toasts.length) {
    toasts = next
    emit()
  }
}

export const toast = {
  show,
  dismiss,
  success: (message, options) => show(message, { ...options, type: 'success' }),
  error: (message, options) => show(message, { duration: 7000, ...options, type: 'error' }),
  warning: (message, options) => show(message, { duration: 8000, ...options, type: 'warning' }),
  info: (message, options) => show(message, { ...options, type: 'info' }),
}

export function subscribeToasts(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getToasts() {
  return toasts
}
