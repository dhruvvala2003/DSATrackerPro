import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, CircleAlert, Clock, FileText, ImageIcon, ListTree, Pencil, Plus, Video, X } from 'lucide-react'
import Loading from '../common/Loading'
import ReadOnlyNote from '../notes/ReadOnlyNote'
import { UNTITLED, fetchPage, fetchPageList, fetchSubject } from '../../lib/notesApi'
import { collectHeadings, countMedia, countWords, isDocEmpty, readingMinutes } from '../../lib/noteContent'

const HEADER_OFFSET = 64

const titleOf = (page) => (page?.title && page.title !== UNTITLED ? page.title : 'Untitled')

function updatedLabel(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const minutes = Math.floor((Date.now() - date) / 60000)
  if (minutes < 1) return 'Updated just now'
  if (minutes < 60) return `Updated ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Updated ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Updated ${days}d ago`
  return `Updated ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function headingElements(root) {
  return root ? Array.from(root.querySelectorAll('.ProseMirror > h1, .ProseMirror > h2, .ProseMirror > h3')) : []
}

function Lightbox({ image, onClose }) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 p-4 sm:p-10 bg-slate-950/85 backdrop-blur-sm cursor-zoom-out"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.img
        src={image.src}
        alt={image.alt}
        className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      />
      {image.alt && <p className="max-w-2xl text-center text-sm text-slate-200">{image.alt}</p>}
      <button type="button" onClick={onClose} aria-label="Close image" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
        <X size={20} />
      </button>
    </motion.div>
  )
}

function PageList({ pages, currentIndex, onSelect }) {
  return (
    <div className="space-y-0.5">
      {pages.map((page, i) => {
        const title = titleOf(page)
        return (
          <div key={page.id} className="relative group">
            <button
              type="button"
              title={title}
              onClick={() => onSelect(i)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-sm transition-colors ${
                i === currentIndex ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="w-5 shrink-0 text-right font-mono text-[11px] text-slate-400">{i + 1}</span>
              <span className="truncate">{title}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function NoteReaderPage() {
  const { subjectId, pageId } = useParams()
  const navigate = useNavigate()
  const [meta, setMeta] = useState(null) // { subject, pages } | { error }
  const [contentById, setContentById] = useState({})
  const [lightbox, setLightbox] = useState(null)
  const [pagesOpen, setPagesOpen] = useState(false)
  const [activeHeading, setActiveHeading] = useState(-1)
  const articleRef = useRef(null)
  const progressRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([fetchSubject(subjectId, controller.signal), fetchPageList(subjectId, { signal: controller.signal })])
      .then(([subject, pages]) => { if (!controller.signal.aborted) setMeta({ subject, pages }) })
      .catch((error) => { if (!controller.signal.aborted) setMeta({ error }) })
    return () => controller.abort()
  }, [subjectId])

  const pages = useMemo(() => meta?.pages || [], [meta])
  const foundIndex = pageId ? pages.findIndex((p) => p.id === pageId) : 0
  const index = Math.max(0, foundIndex)
  const current = pages[index]
  const currentId = current?.id
  const row = currentId ? contentById[currentId] : undefined

  useEffect(() => {
    if (!currentId || contentById[currentId]) return undefined
    const controller = new AbortController()
    fetchPage(currentId, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) setContentById((prev) => ({ ...prev, [currentId]: page || { missing: true } }))
      })
      .catch((error) => {
        if (!controller.signal.aborted) setContentById((prev) => ({ ...prev, [currentId]: { error } }))
      })
    return () => controller.abort()
  }, [currentId, contentById])

  const content = row && !row.error && !row.missing ? row.content : null
  // Indices match headingElements(), so empty headings stay in the list and are just not shown.
  const headings = useMemo(() => collectHeadings(content), [content])
  const outlineSize = headings.filter((heading) => heading.text).length
  const stats = useMemo(() => ({ words: countWords(content), ...countMedia(content) }), [content])

  const goTo = useCallback((i) => {
    const target = pages[i]
    if (!target) return
    setPagesOpen(false)
    navigate(`/notes/subject/${subjectId}/read/${target.id}`, { replace: true })
    window.scrollTo({ top: 0 })
  }, [pages, subjectId, navigate])

  // Reading progress bar + "On this page" highlighting
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const article = articleRef.current
      if (!article) return
      const rect = article.getBoundingClientRect()
      const scrollable = rect.height - (window.innerHeight - HEADER_OFFSET)
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, (HEADER_OFFSET - rect.top) / scrollable)) : 1
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`
      let active = -1
      headingElements(article).forEach((el, i) => { if (el.getBoundingClientRect().top < 150) active = i })
      setActiveHeading(active)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [currentId, row])

  // ← / → turn pages
  useEffect(() => {
    const onKey = (event) => {
      if (lightbox || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'ArrowLeft' && index > 0) goTo(index - 1)
      if (event.key === 'ArrowRight' && index < pages.length - 1) goTo(index + 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, pages.length, lightbox, goTo])

  const closeLightbox = useCallback(() => setLightbox(null), [])

  const openImage = (event) => {
    const img = event.target.closest?.('img.note-image')
    if (img) setLightbox({ src: img.currentSrc || img.src, alt: img.alt })
  }

  const scrollToHeading = (i) => {
    headingElements(articleRef.current)[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!meta) return <Loading />

  if (meta.error || !meta.subject) {
    return (
      <div className="max-w-xl mx-auto text-center py-24">
        <CircleAlert size={40} className="mx-auto text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">{meta.error ? 'Couldn’t load these notes' : 'Subject not found'}</h2>
        <p className="text-slate-500 mb-6">{meta.error?.message || 'It may have been deleted.'}</p>
        <Link to="/notes" className="text-indigo-600 font-semibold hover:text-indigo-700">Back to subjects</Link>
      </div>
    )
  }

  if (pages.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto pb-20">
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mb-4"><BookOpen size={30} /></div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Nothing to read yet</h2>
          <p className="text-slate-500 mb-6">Write the first page of {meta.subject.name}, then come back to read it here.</p>
          <Link to={`/notes/subject/${subjectId}/edit`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md">
            <Plus size={18} /> Write the first page
          </Link>
        </div>
      </div>
    )
  }

  const prev = pages[index - 1]
  const next = pages[index + 1]
  const loadingContent = !row
  const empty = !loadingContent && !row.error && !row.missing && isDocEmpty(content)

  return (
    <motion.div className="w-full max-w-6xl mx-auto pb-24" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}>
      <div className="fixed left-0 right-0 z-40 h-[3px] pointer-events-none" style={{ top: HEADER_OFFSET }}>
        <div ref={progressRef} className="h-full origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-transform duration-75" style={{ transform: 'scaleX(0)' }} />
      </div>

      {/* Top bar */}
      <div className="relative flex items-center justify-between gap-3 mb-6">
        <Link to={`/notes/subject/${subjectId}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors group min-w-0">
          <ArrowLeft size={16} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
          <span className="truncate">Back to {meta.subject.name}</span>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setPagesOpen((open) => !open)}
            className={`lg:hidden h-9 px-3 rounded-xl inline-flex items-center gap-1.5 text-sm font-semibold border transition-colors ${pagesOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            <ListTree size={15} /> Pages
          </button>
          <Link
            to={`/notes/subject/${subjectId}/edit/${currentId}`}
            className="h-9 px-3.5 rounded-xl inline-flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Pencil size={14} /> Edit
          </Link>
        </div>
        <AnimatePresence>
          {pagesOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="lg:hidden absolute top-full right-0 mt-2 z-40 w-72 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              <PageList pages={pages} currentIndex={index} onSelect={goTo} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid lg:grid-cols-[248px_minmax(0,1fr)] gap-8 xl:gap-12 items-start">
        <aside className="hidden lg:block sticky top-24 space-y-4">
          {outlineSize > 1 && (
            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">On this page</p>
              <nav className="space-y-0.5 max-h-[40vh] overflow-y-auto">
                {headings.map((heading, i) => heading.text && (
                  <button
                    key={`${i}-${heading.text}`}
                    type="button"
                    onClick={() => scrollToHeading(i)}
                    className={`block w-full text-left text-sm leading-snug py-1 border-l-2 transition-colors ${heading.level === 1 ? 'pl-3' : heading.level === 2 ? 'pl-5' : 'pl-7'} ${
                      i === activeHeading ? 'border-indigo-500 text-indigo-700 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {heading.text}
                  </button>
                ))}
              </nav>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-3 shadow-sm">
            <p className="px-2.5 pt-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Pages</p>
            <div className="max-h-[40vh] overflow-y-auto">
              <PageList pages={pages} currentIndex={index} onSelect={goTo} />
            </div>
          </div>
        </aside>

        <article
          ref={articleRef}
          onClick={openImage}
          className="min-w-0 rounded-3xl border border-slate-200 bg-white px-5 sm:px-12 lg:px-16 py-10 sm:py-14 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.25)]"
        >
          <div className="max-w-[720px] mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-5 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{meta.subject.name}</span>
              <span className="text-slate-400">Page {index + 1} of {pages.length}</span>
            </div>
            <h1 className="text-3xl sm:text-[2.75rem] font-extrabold tracking-tight leading-[1.15] text-slate-900">{titleOf(current)}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {readingMinutes(stats.words)} min read</span>
              <span>{updatedLabel(row?.updated_at || current.updated_at)}</span>
              {stats.images > 0 && <span className="inline-flex items-center gap-1.5"><ImageIcon size={14} /> {stats.images}</span>}
              {stats.videos > 0 && <span className="inline-flex items-center gap-1.5"><Video size={14} /> {stats.videos}</span>}
            </div>
            <div className="my-8 h-px bg-gradient-to-r from-slate-200 via-slate-200 to-transparent" />

            {loadingContent && (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 rounded bg-slate-100" />
                <div className="h-4 w-11/12 rounded bg-slate-100" />
                <div className="h-4 w-4/5 rounded bg-slate-100" />
              </div>
            )}
            {row?.error && (
              <p className="flex items-center gap-2 text-rose-600"><CircleAlert size={18} /> Couldn’t load this page. {row.error.message}</p>
            )}
            {empty && (
              <div className="text-center py-12">
                <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 mb-4">This page is empty.</p>
                <Link to={`/notes/subject/${subjectId}/edit/${currentId}`} className="text-indigo-600 font-semibold hover:text-indigo-700">Start writing →</Link>
              </div>
            )}
            {!loadingContent && !row.error && !row.missing && !empty && <ReadOnlyNote key={currentId} content={content} />}
          </div>
        </article>
      </div>

      {/* Previous / next */}
      <nav className="mt-8 grid sm:grid-cols-2 gap-4 lg:pl-[calc(248px+2rem)] xl:pl-[calc(248px+3rem)]" aria-label="Page navigation">
        {prev ? (
          <button type="button" onClick={() => goTo(index - 1)} className="group text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 mb-1"><ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Previous</span>
            <span className="block font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{titleOf(prev)}</span>
          </button>
        ) : <span className="hidden sm:block" />}
        {next ? (
          <button type="button" onClick={() => goTo(index + 1)} className="group text-right p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
            <span className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-400 mb-1">Next <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></span>
            <span className="block font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{titleOf(next)}</span>
          </button>
        ) : (
          <Link to={`/notes/subject/${subjectId}/edit`} className="group flex flex-col items-end justify-center p-5 rounded-2xl border border-dashed border-slate-300 text-right hover:border-indigo-300 hover:bg-indigo-50/40 transition-all">
            <span className="text-xs font-semibold text-slate-400 mb-1">You’ve reached the end</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-indigo-600"><Plus size={16} /> Add another page</span>
          </Link>
        )}
      </nav>

      {pages.length > 1 && (
        <p className="mt-6 text-center text-xs font-medium text-slate-400">
          Use <kbd className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[10px] text-slate-500">←</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[10px] text-slate-500">→</kbd> to turn pages
        </p>
      )}

      {createPortal(
        <AnimatePresence>{lightbox && <Lightbox image={lightbox} onClose={closeLightbox} />}</AnimatePresence>,
        document.body,
      )}
    </motion.div>
  )
}
