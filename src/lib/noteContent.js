// Helpers for the TipTap JSON documents stored in notes_pages.content.

const BLOCK_SEPARATOR = ' '
const MEDIA_TYPES = new Set(['image', 'video', 'embed'])

function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (visit(node) === false) return
  if (Array.isArray(node.content)) node.content.forEach((child) => walk(child, visit))
}

function textOf(node) {
  if (!node) return ''
  if (node.type === 'text') return node.text || ''
  if (node.type === 'hardBreak') return ' '
  if (!Array.isArray(node.content)) return ''
  return node.content.map(textOf).join(node.type === 'doc' || node.content.some(isBlock) ? BLOCK_SEPARATOR : '')
}

function isBlock(node) {
  return node && node.type !== 'text' && node.type !== 'hardBreak'
}

export function extractText(doc, limit = Infinity) {
  const text = textOf(doc).replace(/\s+/g, ' ').trim()
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text
}

export function countWords(doc) {
  const text = textOf(doc).trim()
  return text ? text.split(/\s+/).length : 0
}

export function readingMinutes(words) {
  return Math.max(1, Math.round(words / 200))
}

export function findFirstImage(doc) {
  let src = null
  walk(doc, (node) => {
    if (src) return false
    if (node.type === 'image' && typeof node.attrs?.src === 'string' && !node.attrs.src.startsWith('blob:')) {
      src = node.attrs.src
      return false
    }
    return true
  })
  return src
}

export function countMedia(doc) {
  const counts = { images: 0, videos: 0 }
  walk(doc, (node) => {
    if (node.type === 'image') counts.images += 1
    if (node.type === 'video' || node.type === 'embed') counts.videos += 1
    return true
  })
  return counts
}

// Top-level headings only: the page outline (matches `.ProseMirror > h1, h2, h3` in the DOM).
export function collectHeadings(doc) {
  return (doc?.content || [])
    .filter((node) => node.type === 'heading')
    .map((node) => ({ level: node.attrs?.level || 1, text: textOf(node).trim() }))
}

export function isDocEmpty(doc) {
  if (!doc) return true
  let empty = true
  walk(doc, (node) => {
    if (!empty) return false
    if ((node.type === 'text' && node.text?.trim()) || MEDIA_TYPES.has(node.type) || node.type === 'horizontalRule' || node.type === 'table') {
      empty = false
      return false
    }
    return true
  })
  return empty
}

function mapNodes(node, fn) {
  if (!node || typeof node !== 'object') return node
  const mapped = fn(node)
  if (!Array.isArray(mapped.content)) return mapped
  return { ...mapped, content: mapped.content.map((child) => mapNodes(child, fn)) }
}

// Blob URLs only live in this tab. Media still uploading is saved without its preview URL but
// keeps its uploadId, so the upload can be patched into the saved page when it finishes.
export function sanitizeForSave(doc) {
  if (!doc) return doc
  return mapNodes(doc, (node) =>
    typeof node.attrs?.src === 'string' && node.attrs.src.startsWith('blob:')
      ? { ...node, attrs: { ...node.attrs, src: null } }
      : node,
  )
}

export function patchUploadInContent(doc, uploadId, attrs) {
  let changed = false
  const content = mapNodes(doc, (node) => {
    if (node.attrs?.uploadId !== uploadId) return node
    changed = true
    return { ...node, attrs: { ...node.attrs, ...attrs, uploadId: null } }
  })
  return { content, changed }
}

export function removeUploadFromContent(doc, uploadId) {
  let changed = false
  const prune = (node) => {
    if (!Array.isArray(node.content)) return node
    const content = node.content
      .filter((child) => {
        const match = child.attrs?.uploadId === uploadId
        if (match) changed = true
        return !match
      })
      .map(prune)
    return { ...node, content }
  }
  const content = doc ? prune(doc) : doc
  return { content, changed }
}

export function sameContent(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}
