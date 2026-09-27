import { useEffect, useState, useSyncExternalStore } from 'react'
import { clearDraft, savePage, trackWrite, writeDraft } from '../../lib/notesApi'
import { sanitizeForSave } from '../../lib/noteContent'

const DEBOUNCE_MS = 800 // save this long after the user stops typing…
const MAX_WAIT_MS = 5000 // …but never wait longer than this while they keep typing
const DRAFT_DEBOUNCE_MS = 300
const MAX_RETRY_MS = 30000

/**
 * Saves one page reliably:
 * - every edit is saved (debounced), including pages that have no title yet
 * - pending edits are flushed when the editor closes, the tab is hidden or the window unloads
 * - only one request runs at a time; edits made meanwhile are saved right after it
 * - failed saves are retried with backoff, and unsaved edits are mirrored to localStorage
 *   until the server confirms them, so nothing typed is ever lost
 */
export class AutosaveController {
  constructor({ pageId, getData }) {
    this.pageId = pageId
    this.getData = getData // () => ({ title, content })
    this.version = 0 // bumped on every local edit
    this.savedVersion = 0 // last version the server confirmed
    this.inFlight = null
    this.saveAgain = false
    this.saveTimer = null
    this.draftTimer = null
    this.retryTimer = null
    this.retryDelay = 0
    this.firstUnsavedAt = 0
    this.disposed = false
    this.snapshot = { status: 'saved', lastSavedAt: null, error: null }
    this.listeners = new Set()
  }

  subscribe = (listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.snapshot

  get hasUnsavedChanges() {
    return this.version !== this.savedVersion
  }

  setSnapshot(patch) {
    this.snapshot = { ...this.snapshot, ...patch }
    this.listeners.forEach((listener) => listener())
  }

  markDirty = () => {
    this.version += 1
    if (!this.firstUnsavedAt) this.firstUnsavedAt = Date.now()
    if (this.snapshot.status === 'saved') this.setSnapshot({ status: 'unsaved' })

    clearTimeout(this.draftTimer)
    this.draftTimer = setTimeout(() => this.writeDraftNow(), DRAFT_DEBOUNCE_MS)

    clearTimeout(this.saveTimer)
    const waited = Date.now() - this.firstUnsavedAt
    const delay = Math.max(0, Math.min(DEBOUNCE_MS, MAX_WAIT_MS - waited))
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.save()
    }, delay)
  }

  writeDraftNow() {
    clearTimeout(this.draftTimer)
    this.draftTimer = null
    if (!this.hasUnsavedChanges) return
    const { title, content } = this.getData()
    writeDraft(this.pageId, { title, content: sanitizeForSave(content) })
  }

  save = () => {
    if (this.inFlight) {
      this.saveAgain = true
      return this.inFlight
    }
    if (!this.hasUnsavedChanges) return Promise.resolve()
    this.inFlight = trackWrite(this.runSave())
    return this.inFlight
  }

  async runSave() {
    clearTimeout(this.saveTimer)
    this.saveTimer = null
    clearTimeout(this.retryTimer)
    this.retryTimer = null

    const version = this.version
    const { title, content } = this.getData()
    this.firstUnsavedAt = 0
    this.setSnapshot({ status: 'saving' })

    try {
      await savePage(this.pageId, { title, content: sanitizeForSave(content) })
      this.savedVersion = Math.max(this.savedVersion, version)
      this.retryDelay = 0
      if (this.hasUnsavedChanges) {
        this.setSnapshot({ status: 'unsaved', lastSavedAt: new Date(), error: null })
      } else {
        clearDraft(this.pageId)
        this.setSnapshot({ status: 'saved', lastSavedAt: new Date(), error: null })
      }
    } catch (error) {
      console.error('Autosave failed:', error)
      this.writeDraftNow()
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      this.setSnapshot({ status: offline ? 'offline' : 'error', error })
      this.inFlight = null
      this.saveAgain = false
      // After the editor closes, the local draft takes over: it is restored and saved the next
      // time the page is opened. Retrying from a closed editor could overwrite newer edits.
      if (error?.code !== 'PAGE_NOT_FOUND' && !this.disposed) this.scheduleRetry()
      return
    }

    this.inFlight = null
    // Edits typed during the request already scheduled a debounced save; an explicit save()
    // or flush() that arrived meanwhile is honoured right away.
    if (this.saveAgain || (this.hasUnsavedChanges && !this.saveTimer)) {
      this.saveAgain = false
      await this.save()
    }
  }

  scheduleRetry() {
    this.retryDelay = Math.min(MAX_RETRY_MS, this.retryDelay ? this.retryDelay * 2 : 2000)
    clearTimeout(this.retryTimer)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.save()
    }, this.retryDelay)
  }

  retryNow = () => {
    clearTimeout(this.retryTimer)
    this.retryTimer = null
    this.retryDelay = 0
    return this.save()
  }

  flush = async () => {
    clearTimeout(this.saveTimer)
    this.saveTimer = null
    if (this.inFlight) {
      if (this.hasUnsavedChanges) this.saveAgain = true
      await this.inFlight
    }
    if (this.hasUnsavedChanges) await this.save()
  }

  onBeforeUnload = (event) => {
    if (!this.hasUnsavedChanges && !this.inFlight) return
    this.writeDraftNow()
    this.save()
    event.preventDefault()
    event.returnValue = '' // asks the browser to confirm leaving while a save is pending
  }

  onPageHide = () => {
    if (!this.hasUnsavedChanges) return
    this.writeDraftNow()
    this.save()
  }

  onVisibilityChange = () => {
    if (document.visibilityState !== 'hidden' || !this.hasUnsavedChanges) return
    this.writeDraftNow()
    this.flush()
  }

  onOnline = () => {
    if (this.hasUnsavedChanges) this.retryNow()
  }

  attach() {
    this.disposed = false
    window.addEventListener('beforeunload', this.onBeforeUnload)
    window.addEventListener('pagehide', this.onPageHide)
    window.addEventListener('online', this.onOnline)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  detach() {
    window.removeEventListener('beforeunload', this.onBeforeUnload)
    window.removeEventListener('pagehide', this.onPageHide)
    window.removeEventListener('online', this.onOnline)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.disposed = true
    clearTimeout(this.retryTimer)
    this.retryTimer = null
    if (this.hasUnsavedChanges) this.writeDraftNow()
    // Keep saving after the editor closes; other screens wait for this via waitForPendingWrites().
    trackWrite(this.flush())
  }
}

/** `getData` must be stable and read the latest values from refs. */
export function useAutosave(pageId, getData) {
  const [controller] = useState(() => new AutosaveController({ pageId, getData }))
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)

  useEffect(() => {
    controller.attach()
    return () => controller.detach()
  }, [controller])

  return { ...state, controller }
}
