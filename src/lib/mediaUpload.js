import { supabase, supabaseAnonKey, supabaseUrl } from './supabaseClient'

// Public Supabase Storage bucket for note photos & videos (see supabase-policies.sql).
export const MEDIA_BUCKET = 'notes-media'
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // Supabase's default per-file limit

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/ogg': 'ogv',
}

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/avif'
export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/ogg'

export function mediaKind(file) {
  if (!file?.type) return null
  if (file.type in EXTENSIONS) return file.type.startsWith('image/') ? 'image' : 'video'
  return null
}

export class UploadError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

export function uniqueId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

async function decodeImage(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return createImageBitmap(file)
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Downscales and re-encodes large photos so pages load fast (a 5 MB phone photo usually
 * becomes ~300 KB). GIFs keep their animation; anything that can't be decoded is left as-is.
 */
export async function optimizeImage(file, { maxDimension = 2000, quality = 0.85, skipBelowBytes = 350 * 1024 } = {}) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) return file
  let bitmap
  try {
    bitmap = await decodeImage(file)
  } catch {
    return file
  }
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size <= skipBelowBytes) {
    bitmap.close?.()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()

  let blob = await canvasToBlob(canvas, 'image/webp', quality)
  if (!blob || blob.type !== 'image/webp') {
    // Browsers without WebP encoding: keep transparency for PNGs, use JPEG for photos.
    blob = await canvasToBlob(canvas, file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality)
  }
  return blob && blob.size < file.size ? blob : file
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function toUploadError(status, body) {
  let message
  let code = String(status)
  try {
    const json = JSON.parse(body)
    message = json.message || json.error || ''
    code = String(json.statusCode || status)
  } catch {
    message = body || ''
  }
  if (/bucket not found/i.test(message) || code === '404') {
    return new UploadError('Photo & video storage isn’t set up in Supabase yet.', 'BUCKET_MISSING')
  }
  if (code === '413' || /maximum allowed size|too large/i.test(message)) {
    return new UploadError('This file is larger than your Supabase storage allows.', 'TOO_LARGE')
  }
  if (code === '401' || code === '403' || /row-level security|unauthorized|not allowed/i.test(message)) {
    return new UploadError('Your Supabase storage policies don’t allow uploads yet.', 'NOT_ALLOWED')
  }
  if (code === '415' || /mime/i.test(message)) {
    return new UploadError('This file type isn’t allowed by your storage bucket.', 'BAD_TYPE')
  }
  return new UploadError(message || `Upload failed (${status}).`, 'FAILED')
}

/**
 * Uploads a file to the notes media bucket and resolves with its public URL.
 * Uses XHR (not fetch) so large videos can report upload progress.
 */
export function uploadToStorage(blob, { folder = 'misc', onProgress, signal } = {}) {
  const type = blob.type || 'application/octet-stream'
  const path = `${folder}/${Date.now()}-${uniqueId().slice(0, 8)}.${EXTENSIONS[type] || 'bin'}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${MEDIA_BUCKET}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseAnonKey}`)
    xhr.setRequestHeader('apikey', supabaseAnonKey)
    xhr.setRequestHeader('Content-Type', type)
    xhr.setRequestHeader('Cache-Control', 'max-age=31536000')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl, path })
      } else {
        reject(toUploadError(xhr.status, xhr.responseText))
      }
    }
    xhr.onerror = () => reject(new UploadError('Network error while uploading.', 'NETWORK'))
    xhr.onabort = () => reject(new UploadError('Upload cancelled.', 'ABORTED'))
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(blob)
  })
}

// ---------------------------------------------------------------------------
// Links: YouTube / Vimeo / Loom / Google Drive embeds, and direct media URLs
// ---------------------------------------------------------------------------
const EMBED_PREFIXES = [
  'https://www.youtube-nocookie.com/embed/',
  'https://www.youtube.com/embed/',
  'https://player.vimeo.com/video/',
  'https://www.loom.com/embed/',
  'https://drive.google.com/file/d/',
]

export function isAllowedEmbedSrc(src) {
  return typeof src === 'string' && EMBED_PREFIXES.some((prefix) => src.startsWith(prefix))
}

function parseStartSeconds(value) {
  if (!value) return 0
  if (/^\d+$/.test(value)) return Number(value)
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
  if (!match) return 0
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0)
}

export const EMBED_PROVIDERS = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  loom: 'Loom',
  drive: 'Google Drive',
}

export function parseEmbedUrl(input) {
  let url
  try {
    url = new URL(String(input).trim())
  } catch {
    return null
  }
  if (!/^https?:$/.test(url.protocol)) return null
  const host = url.hostname.replace(/^(www|m|music)\./, '')
  const original = url.toString()

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') {
    const id = host === 'youtu.be'
      ? url.pathname.slice(1).split('/')[0]
      : url.searchParams.get('v') || /^\/(?:embed|shorts|live|v)\/([\w-]{11})/.exec(url.pathname)?.[1]
    if (!id || !/^[\w-]{11}$/.test(id)) return null
    const start = parseStartSeconds(url.searchParams.get('t') || url.searchParams.get('start'))
    return {
      provider: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ''}`,
      url: original,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    }
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const match = /^\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/.exec(url.pathname)
    if (!match) return null
    const hash = match[2] || url.searchParams.get('h')
    return { provider: 'vimeo', src: `https://player.vimeo.com/video/${match[1]}${hash ? `?h=${hash}` : ''}`, url: original }
  }
  if (host === 'loom.com') {
    const match = /^\/(?:share|embed)\/([\da-f]+)/.exec(url.pathname)
    if (!match) return null
    return { provider: 'loom', src: `https://www.loom.com/embed/${match[1]}`, url: original }
  }
  if (host === 'drive.google.com') {
    const match = /\/file\/d\/([\w-]+)/.exec(url.pathname)
    if (!match) return null
    return { provider: 'drive', src: `https://drive.google.com/file/d/${match[1]}/preview`, url: original }
  }
  return null
}

export function mediaKindFromUrl(input) {
  let url
  try {
    url = new URL(String(input).trim())
  } catch {
    return null
  }
  if (!/^https?:$/.test(url.protocol)) return null
  if (/\.(jpe?g|png|gif|webp|avif|svg)$/i.test(url.pathname)) return 'image'
  if (/\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(url.pathname)) return 'video'
  return null
}
