import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, CircleAlert, FileText, LoaderCircle, Plus } from 'lucide-react'
import NoteEditor from '../notes/NoteEditor'
import { UNTITLED, clearDraft, createPage, fetchPage, fetchPageList, fetchSubject, fetchSubnote, readDraft } from '../../lib/notesApi'
import { sameContent } from '../../lib/noteContent'
import { toast } from '../../lib/toast'

// One insert per navigation, even when React StrictMode runs the effect twice.
const pendingCreates = new Map()

function createOnce(subnoteId, subjectId, key) {
  if (!pendingCreates.has(key)) pendingCreates.set(key, createPage(subnoteId, subjectId))
  return pendingCreates.get(key)
}

const displayTitle = (title) => (title && title !== UNTITLED ? title : '')

function parseContent(raw) {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  return raw
}

// Prefer this browser's unsaved draft when it is newer than what the server has.
function prepareInitial(page) {
  const title = displayTitle(page.title)
  const draft = readDraft(page.id)
  const serverContent = parseContent(page.content)
  if (draft) {
    const draftContent = parseContent(draft.content)
    const newer = draft.savedAt > (Date.parse(page.updated_at) || 0)
    const differs = (draft.title ?? '') !== title || !sameContent(draftContent, serverContent)
    if (newer && differs) return { title: draft.title ?? title, content: draftContent ?? null, restored: true }
    clearDraft(page.id)
  }
  return { title, content: serverContent ?? null, restored: false }
}

function PagesSidebar({ subject, subnote, basePath, pages, currentId }) {
  const parentName = subnote?.name || subject?.name || '…'
  return (
    <aside className="hidden xl:block sticky top-24">
      <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-3 shadow-sm">
        <Link to={basePath} className="block px-2 pt-1 pb-3 group">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {subnote ? 'Sub-note' : 'Notebook'}
          </p>
          <p className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
            {parentName}
          </p>
        </Link>
        <nav className="space-y-0.5 max-h-[calc(100vh-18rem)] overflow-y-auto -mx-1 px-1" aria-label="Pages">
          {pages.map((page, index) => {
            const title = displayTitle(page.title) || 'Untitled'
            return (
              <div key={page.id} className="relative group">
                <NavLink
                  to={`${basePath}/edit/${page.id}`}
                  title={title}
                  className={({ isActive }) => `flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive || page.id === currentId ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="w-5 shrink-0 text-[11px] font-mono text-slate-400 text-right">{index + 1}</span>
                  <span className="truncate">{title}</span>
                </NavLink>
              </div>
            )
          })}
        </nav>
        <Link
          to={`${basePath}/edit`}
          className="mt-3 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
        >
          <Plus size={15} /> New page
        </Link>
      </div>
    </aside>
  )
}

function EditorSkeleton({ label }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="h-12 border-b border-slate-100 bg-slate-50/60" />
      <div className="px-6 sm:px-14 py-10 space-y-4 animate-pulse">
        <div className="h-10 w-2/3 rounded-xl bg-slate-100" />
        <div className="h-3 w-40 rounded bg-slate-100" />
        <div className="pt-6 space-y-3">
          <div className="h-4 rounded bg-slate-100" />
          <div className="h-4 w-11/12 rounded bg-slate-100" />
          <div className="h-4 w-4/5 rounded bg-slate-100" />
        </div>
        {label && (
          <p className="pt-6 flex items-center gap-2 text-sm font-medium text-slate-400">
            <LoaderCircle size={15} className="animate-spin" /> {label}
          </p>
        )}
      </div>
    </div>
  )
}

function Problem({ title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4"><CircleAlert size={26} /></div>
      <h2 className="text-xl font-bold text-slate-900 mb-1.5">{title}</h2>
      <p className="text-slate-500 max-w-sm mb-6">{message}</p>
      {action}
    </div>
  )
}

export default function NoteEditorPage() {
  const { subjectId, subnoteId, pageId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [subject, setSubject] = useState(null)
  const [subnote, setSubnote] = useState(null)
  const [pages, setPages] = useState([])
  const [loaded, setLoaded] = useState(null) // { pageId, page, initial } | { pageId, missing } | { pageId, error }
  const [createError, setCreateError] = useState(null) // { key, error }
  const [attempt, setAttempt] = useState(0)

  const basePath = subnoteId
    ? `/notes/subject/${subjectId}/subnote/${subnoteId}`
    : `/notes/subject/${subjectId}`

  // Subject/subnote + page list for sidebar
  useEffect(() => {
    const controller = new AbortController()
    if (subnoteId) {
      Promise.all([
        fetchSubject(subjectId, controller.signal),
        fetchSubnote(subnoteId, controller.signal),
        fetchPageList(subnoteId, { bySubnote: true, signal: controller.signal }),
      ])
        .then(([subjectRow, subnoteRow, list]) => {
          if (controller.signal.aborted) return
          setSubject(subjectRow)
          setSubnote(subnoteRow)
          setPages((prev) => [...list, ...prev.filter((p) => !list.some((row) => row.id === p.id))])
        })
        .catch((error) => {
          if (!controller.signal.aborted) console.error('Could not load subnote info:', error)
        })
    } else {
      Promise.all([
        fetchSubject(subjectId, controller.signal),
        fetchPageList(subjectId, { bySubnote: false, signal: controller.signal }),
      ])
        .then(([subjectRow, list]) => {
          if (controller.signal.aborted) return
          setSubject(subjectRow)
          setPages((prev) => [...list, ...prev.filter((p) => !list.some((row) => row.id === p.id))])
        })
        .catch((error) => {
          if (!controller.signal.aborted) console.error('Could not load subject:', error)
        })
    }
    return () => controller.abort()
  }, [subjectId, subnoteId])

  // "/edit" without pageId: create page and navigate into it
  const createKey = `${subnoteId || subjectId}:${location.key}:${attempt}`
  useEffect(() => {
    if (pageId) return undefined
    let cancelled = false
    createOnce(subnoteId, subjectId, createKey)
      .then((page) => {
        if (cancelled) return
        setPages((prev) => (prev.some((p) => p.id === page.id) ? prev : [...prev, page]))
        navigate(`${basePath}/edit/${page.id}`, { replace: true, state: { justCreated: true } })
      })
      .catch((error) => {
        if (!cancelled) setCreateError({ key: createKey, error })
      })
    return () => { cancelled = true }
  }, [pageId, subnoteId, subjectId, createKey, basePath, navigate])

  // The page being edited
  useEffect(() => {
    if (!pageId) return undefined
    const controller = new AbortController()
    fetchPage(pageId, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return
        if (!page) {
          setLoaded({ pageId, missing: true })
          return
        }
        const initial = prepareInitial(page)
        if (initial.restored) {
          toast.info('Recovered your unsaved changes', {
            description: 'Edits from your last session hadn’t reached the server yet. They’ve been restored and are saving now.',
          })
        }
        setLoaded({ pageId, page, initial })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoaded({ pageId, error })
      })
    return () => controller.abort()
  }, [pageId, attempt])

  const handleTitleChange = useCallback((id, title) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, title: title.trim() || UNTITLED } : p)))
  }, [])

  const handleDiscard = useCallback((id) => {
    setPages((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const current = loaded?.pageId === pageId ? loaded : null
  const creationFailed = !pageId && createError?.key === createKey

  let body
  if (!pageId) {
    body = creationFailed ? (
      <Problem
        title="Couldn’t create the page"
        message={createError.error?.message || 'Check your connection and try again.'}
        action={<button type="button" onClick={() => setAttempt((n) => n + 1)} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Try again</button>}
      />
    ) : (
      <EditorSkeleton label="Creating a new page…" />
    )
  } else if (!current) {
    body = <EditorSkeleton />
  } else if (current.missing) {
    body = (
      <Problem
        title="Page not found"
        message="It may have been deleted."
        action={<Link to={basePath} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Back to notes</Link>}
      />
    )
  } else if (current.error) {
    body = (
      <Problem
        title="Couldn’t load this page"
        message={current.error.message || 'Check your connection and try again.'}
        action={<button type="button" onClick={() => setAttempt((n) => n + 1)} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Try again</button>}
      />
    )
  } else {
    body = (
      <NoteEditor
        key={pageId}
        page={current.page}
        initialTitle={current.initial.title}
        initialContent={current.initial.content}
        restored={current.initial.restored}
        justCreated={Boolean(location.state?.justCreated)}
        onTitleChange={handleTitleChange}
        onDiscard={handleDiscard}
      />
    )
  }

  const backTitle = subnote?.name || subject?.name || 'notes'

  return (
    <motion.div
      className="w-full max-w-7xl mx-auto pb-24"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
    >
      <div className="grid xl:grid-cols-[220px_minmax(0,1fr)] gap-6 xl:gap-10 items-start">
        <PagesSidebar
          subject={subject}
          subnote={subnote}
          basePath={basePath}
          pages={pages}
          currentId={pageId}
        />

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 mb-5">
            <Link
              to={basePath}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors group min-w-0"
            >
              <ArrowLeft size={16} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
              <span className="truncate">Back to {backTitle}</span>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`${basePath}/edit`}
                className="xl:hidden h-9 px-3 rounded-xl inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
              >
                <Plus size={15} /> Page
              </Link>
              {pageId && (
                <Link
                  to={`${basePath}/read/${pageId}`}
                  className="h-9 px-3.5 rounded-xl inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-colors"
                >
                  <BookOpen size={15} /> Read
                </Link>
              )}
            </div>
          </div>

          {body}
        </div>
      </div>
    </motion.div>
  )
}
