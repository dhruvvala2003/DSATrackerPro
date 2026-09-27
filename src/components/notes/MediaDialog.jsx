import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CircleAlert, CircleCheck, CloudUpload, ImageIcon, Link2, MonitorPlay, Video, X } from 'lucide-react'
import { EMBED_PROVIDERS, IMAGE_ACCEPT, VIDEO_ACCEPT, mediaKindFromUrl, parseEmbedUrl } from '../../lib/mediaUpload'

const COPY = {
  image: {
    title: 'Add a photo',
    icon: ImageIcon,
    accept: IMAGE_ACCEPT,
    formats: 'JPG, PNG, GIF or WebP · up to 20 MB · large photos are optimised automatically',
    linkLabel: 'Image link',
    linkPlaceholder: 'https://example.com/diagram.png',
  },
  video: {
    title: 'Add a video',
    icon: Video,
    accept: VIDEO_ACCEPT,
    formats: 'MP4, WebM or MOV · up to 50 MB',
    linkLabel: 'YouTube, Vimeo, Loom or Google Drive link',
    linkPlaceholder: 'https://www.youtube.com/watch?v=…',
  },
}

function resolveLink(kind, value) {
  const url = value.trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) return { error: 'Links must start with http:// or https://' }
  if (kind === 'image') return { node: { type: 'image', attrs: { src: url } }, label: 'Image' }
  const embed = parseEmbedUrl(url)
  if (embed) {
    return {
      node: { type: 'embed', attrs: { src: embed.src, provider: embed.provider, url: embed.url } },
      label: `${EMBED_PROVIDERS[embed.provider]} video`,
      thumbnail: embed.thumbnail,
    }
  }
  if (mediaKindFromUrl(url) === 'video') return { node: { type: 'video', attrs: { src: url } }, label: 'Video file' }
  return { error: 'Paste a YouTube, Vimeo, Loom or Google Drive link, or a direct link to an .mp4/.webm file.' }
}

export default function MediaDialog({ kind: requestedKind, onClose, onFiles, onInsert }) {
  const kind = requestedKind === 'image' ? 'image' : 'video'
  const copy = COPY[kind]
  const [tab, setTab] = useState(requestedKind === 'embed' ? 'link' : 'upload')
  const [dragging, setDragging] = useState(false)
  const [link, setLink] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const fileInput = useRef(null)
  const resolved = resolveLink(kind, link)
  const Icon = copy.icon

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const pickFiles = (files) => {
    if (!files?.length) return
    onFiles(files)
    onClose()
  }

  const insertLink = (event) => {
    event.preventDefault()
    if (!resolved?.node) return
    onInsert(resolved.node)
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl shadow-slate-900/20 border border-slate-200 overflow-hidden"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icon size={20} /></div>
            <h2 className="text-lg font-bold text-slate-900">{copy.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-6">
          <div className="flex p-1 rounded-xl bg-slate-100 text-sm font-semibold">
            {[
              { id: 'upload', label: 'Upload from device', icon: CloudUpload },
              { id: 'link', label: kind === 'image' ? 'Paste a link' : 'YouTube / link', icon: kind === 'image' ? Link2 : MonitorPlay },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 h-9 rounded-lg inline-flex items-center justify-center gap-2 transition-all ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <input
            ref={fileInput}
            type="file"
            accept={copy.accept}
            multiple
            hidden
            onChange={(event) => pickFiles(event.target.files)}
          />
          {tab === 'upload' ? (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); pickFiles(event.dataTransfer.files) }}
              className={`w-full rounded-2xl border-2 border-dashed px-6 py-10 flex flex-col items-center text-center transition-colors ${
                dragging ? 'border-indigo-400 bg-indigo-50/70' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${dragging ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-500'}`}>
                <CloudUpload size={26} />
              </div>
              <p className="font-semibold text-slate-800">{dragging ? 'Drop to upload' : 'Drag & drop here, or click to browse'}</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs">{copy.formats}</p>
            </button>
          ) : (
            <form onSubmit={insertLink}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2" htmlFor="media-link">{copy.linkLabel}</label>
              <div className="flex gap-2">
                <input
                  id="media-link"
                  autoFocus
                  value={link}
                  onChange={(event) => { setLink(event.target.value); setPreviewFailed(false) }}
                  placeholder={copy.linkPlaceholder}
                  className="flex-1 min-w-0 h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="submit"
                  disabled={!resolved?.node || previewFailed}
                  className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Insert
                </button>
              </div>

              {resolved?.error && (
                <p className="mt-3 flex items-start gap-2 text-sm text-rose-600"><CircleAlert size={16} className="shrink-0 mt-0.5" />{resolved.error}</p>
              )}
              {resolved?.node && !previewFailed && (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600"><CircleCheck size={16} />{resolved.label} detected</p>
              )}
              {kind === 'image' && resolved?.node && (
                previewFailed
                  ? <p className="mt-3 flex items-start gap-2 text-sm text-rose-600"><CircleAlert size={16} className="shrink-0 mt-0.5" />Couldn’t load an image from this link.</p>
                  : <img src={resolved.node.attrs.src} alt="" onError={() => setPreviewFailed(true)} className="mt-4 max-h-48 mx-auto rounded-xl border border-slate-200 object-contain" />
              )}
              {resolved?.thumbnail && (
                <div className="mt-4 relative rounded-xl overflow-hidden border border-slate-200">
                  <img src={resolved.thumbnail} alt="" className="w-full aspect-video object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg"><MonitorPlay size={24} className="text-slate-800" /></div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
          Tip: you can also <span className="font-semibold text-slate-700">paste (Ctrl+V)</span> or <span className="font-semibold text-slate-700">drag</span> photos and videos straight into the page.
        </div>
      </motion.div>
    </motion.div>
  )
}
