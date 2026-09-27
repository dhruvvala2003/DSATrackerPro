import { useSyncExternalStore } from 'react'
import { fetchPage, savePage, trackWrite, waitForPendingWrites } from '../../lib/notesApi'
import { patchUploadInContent, removeUploadFromContent } from '../../lib/noteContent'
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  blobToDataUrl,
  mediaKind,
  optimizeImage,
  uniqueId,
  uploadToStorage,
} from '../../lib/mediaUpload'
import { toast } from '../../lib/toast'

// uploadId -> { kind, progress }. Media nodes read this to show progress while their file uploads.
const uploads = new Map()
const listeners = new Set()
// pageId -> editor, so an upload finishing after its page was closed can patch the saved page instead.
const liveEditors = new Map()

function emit() {
  listeners.forEach((listener) => listener())
}

function setUpload(uploadId, value) {
  if (value) uploads.set(uploadId, value)
  else uploads.delete(uploadId)
  emit()
  syncUnloadGuard()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useUploadState(uploadId) {
  return useSyncExternalStore(subscribe, () => (uploadId ? uploads.get(uploadId) : undefined))
}

function warnBeforeUnload(event) {
  event.preventDefault()
  event.returnValue = ''
}

let guardInstalled = false
function syncUnloadGuard() {
  const active = uploads.size > 0
  if (active && !guardInstalled) window.addEventListener('beforeunload', warnBeforeUnload)
  if (!active && guardInstalled) window.removeEventListener('beforeunload', warnBeforeUnload)
  guardInstalled = active
}

export function registerLiveEditor(pageId, editor) {
  liveEditors.set(pageId, editor)
  return () => {
    if (liveEditors.get(pageId) === editor) liveEditors.delete(pageId)
  }
}

function applyToEditor(editor, uploadId, attrs) {
  let target = null
  editor.state.doc.descendants((node, pos) => {
    if (target) return false
    if (node.attrs?.uploadId === uploadId) {
      target = { node, pos }
      return false
    }
    return true
  })
  if (!target) return // the user removed the placeholder meanwhile
  const tr = editor.state.tr
  if (attrs) tr.setNodeMarkup(target.pos, undefined, { ...target.node.attrs, ...attrs, uploadId: null })
  else tr.delete(target.pos, target.pos + target.node.nodeSize)
  editor.view.dispatch(tr.setMeta('addToHistory', false))
}

async function finishUpload(pageId, uploadId, attrs) {
  const editor = liveEditors.get(pageId)
  if (editor && !editor.isDestroyed) {
    applyToEditor(editor, uploadId, attrs)
    return
  }
  // The page was closed mid-upload: write the result into the saved page.
  const work = (async () => {
    await waitForPendingWrites()
    const page = await fetchPage(pageId)
    if (!page?.content) return
    const { content, changed } = attrs
      ? patchUploadInContent(page.content, uploadId, attrs)
      : removeUploadFromContent(page.content, uploadId)
    if (changed) await savePage(pageId, { title: page.title, content })
  })()
  trackWrite(work)
  try {
    await work
  } catch (error) {
    console.error('Could not attach a finished upload to its page:', error)
  }
}

let storageWarningShown = false
function warnStorageMissing(error) {
  if (storageWarningShown) return
  storageWarningShown = true
  toast.warning('Photo saved inside the note', {
    description: `${error.message} Run the storage section of supabase-policies.sql to upload photos & videos to Supabase Storage.`,
    duration: 12000,
  })
}

function describeFailure(kind, error) {
  if (kind === 'video' && ['BUCKET_MISSING', 'NOT_ALLOWED'].includes(error.code)) {
    return `${error.message} Run the storage section of supabase-policies.sql, or paste a YouTube link instead.`
  }
  if (error.code === 'TOO_LARGE') return `${error.message} For long videos, upload to YouTube and paste the link.`
  return error.message
}

async function runUpload({ file, kind, uploadId, previewUrl }, pageId) {
  const onProgress = (progress) => setUpload(uploadId, { kind, progress })
  try {
    const blob = kind === 'image' ? await optimizeImage(file) : file
    const { url } = await uploadToStorage(blob, { folder: pageId, onProgress })
    await finishUpload(pageId, uploadId, { src: url })
  } catch (error) {
    if (kind === 'image') {
      // Never lose a photo: if storage is unavailable, embed a compressed copy in the page.
      try {
        const small = await optimizeImage(file, { maxDimension: 1400, quality: 0.8, skipBelowBytes: 0 })
        await finishUpload(pageId, uploadId, { src: await blobToDataUrl(small) })
        warnStorageMissing(error)
        return
      } catch (fallbackError) {
        console.error('Image fallback failed:', fallbackError)
      }
    }
    await finishUpload(pageId, uploadId, null)
    toast.error(kind === 'video' ? 'Video couldn’t be uploaded' : 'Photo couldn’t be added', {
      description: describeFailure(kind, error),
    })
  } finally {
    setUpload(uploadId, null)
    // Free the in-memory preview (videos can be large) once the real URL has replaced it.
    setTimeout(() => URL.revokeObjectURL(previewUrl), 30000)
  }
}

/** Inserts upload placeholders for the given files at `pos` and uploads them in the background. */
export function insertMediaFiles(editor, fileList, { pageId, pos } = {}) {
  const items = []
  for (const file of Array.from(fileList || [])) {
    const kind = mediaKind(file)
    if (!kind) {
      toast.error(`“${file.name}” isn’t a supported photo or video`, { description: 'Use JPG, PNG, GIF, WebP, MP4, WebM or MOV files.' })
      continue
    }
    if (file.size > (kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) {
      toast.error(`“${file.name}” is too large`, {
        description: kind === 'video'
          ? 'Videos can be up to 50 MB. For longer videos, upload to YouTube and paste the link.'
          : 'Photos can be up to 20 MB.',
      })
      continue
    }
    items.push({ file, kind, uploadId: uniqueId(), previewUrl: URL.createObjectURL(file) })
  }
  if (!items.length || !editor || editor.isDestroyed) return

  items.forEach(({ uploadId, kind }) => setUpload(uploadId, { kind, progress: 0 }))
  const nodes = items.map(({ kind, previewUrl, uploadId }) => ({ type: kind, attrs: { src: previewUrl, uploadId } }))
  editor.chain().focus().insertContentAt(pos ?? editor.state.selection.to, nodes).run()
  items.forEach((item) => runUpload(item, pageId))
}
