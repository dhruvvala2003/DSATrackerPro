import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'
import { Plus, FileText, Trash2, BookOpen, Clock, ChevronRight, Search, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
}

function getContentPreview(content) {
  if (!content?.content) return 'Empty page'
  const text = content.content
    .filter(n => n.type === 'paragraph' || n.type === 'heading')
    .flatMap(n => (n.content || []).filter(c => c.type === 'text').map(c => c.text))
    .join(' ')
  return text.slice(0, 140) || 'Empty page'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

export default function NotesListPage() {
  const { subjectId } = useParams()
  const [subject, setSubject] = useState(null)
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const fetchData = async () => {
      try {
        // Fetch Subject details
        const { data: subjectData, error: subjectError } = await supabase
          .from('notes_subjects')
          .select('*')
          .eq('id', subjectId)
          .single()
          .abortSignal(controller.signal)
        
        if (subjectError) throw subjectError
        if (!controller.signal.aborted) setSubject(subjectData)

        // Fetch Pages for this subject
        const { data: pagesData, error: pagesError } = await supabase
          .from('notes_pages')
          .select('id, title, content, page_order, created_at, updated_at')
          .eq('subject_id', subjectId)
          .order('page_order', { ascending: true })
          .abortSignal(controller.signal)

        if (pagesError) throw pagesError
        if (!controller.signal.aborted) setPages(pagesData || [])
        
      } catch (err) {
        if (!controller.signal.aborted) console.error('Error fetching data:', err)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [subjectId])

  const handleDelete = async (pageId, pageTitle) => {
    if (!window.confirm(`Delete "${pageTitle || 'Untitled'}"? This cannot be undone.`)) return
    try {
      const { error } = await supabase.from('notes_pages').delete().eq('id', pageId)
      if (error) throw error
      setPages((current) => current.filter((p) => p.id !== pageId))
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const filteredPages = pages.filter(p => 
    !search.trim() || 
    (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
    getContentPreview(p.content).toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Loading />
  if (!subject) return <div className="text-center py-20">Subject not found.</div>

  return (
    <motion.div
      className="w-full max-w-6xl mx-auto pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="mb-6">
        <Link to="/notes" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-2 group text-sm font-medium">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Subjects
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-5">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-sm font-semibold text-slate-700">Project</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
            {subject.name}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'} in this subject.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pages.length > 0 && (
            <Link
              to={`/notes/subject/${subject.id}/read`}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <BookOpen size={18} />
              Read All
            </Link>
          )}
          <Link
            to={`/notes/subject/${subject.id}/edit`}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:-translate-y-0.5"
          >
            <Plus size={18} />
            New Page
          </Link>
        </div>
      </motion.div>

      {/* Filters */}
      {pages.length > 0 && (
        <motion.div variants={itemVariants} className="flex gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages..."
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
            />
          </div>
        </motion.div>
      )}

      {/* Pages Grid */}
      {filteredPages.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center text-violet-400 mb-4">
            <FileText size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {pages.length === 0 ? 'No notes yet' : 'No matching notes'}
          </h2>
          <p className="text-slate-500 mb-6 max-w-sm">
            {pages.length === 0
              ? `Create your first page in ${subject.name}.`
              : 'Try a different search term.'}
          </p>
          {pages.length === 0 && (
            <Link to={`/notes/subject/${subject.id}/edit`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-md">
              <Plus size={18} /> Create First Page
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPages.map((page, idx) => (
            <motion.div key={page.id} variants={itemVariants}>
              <div className="group relative flex flex-col h-full p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-violet-300 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-xs font-bold text-slate-300 select-none">
                    PAGE {idx + 1}
                  </span>
                </div>

                <Link to={`/notes/subject/${subject.id}/edit/${page.id}`} className="relative z-10">
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-violet-600 transition-colors line-clamp-2">
                    {page.title || 'Untitled'}
                  </h3>
                </Link>

                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-4 flex-1 relative z-10">
                  {getContentPreview(page.content)}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 relative z-10">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Clock size={12} />
                    {formatDate(page.updated_at || page.created_at)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(page.id, page.title) }}
                      className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-100 flex items-center justify-center text-rose-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                    <Link
                      to={`/notes/subject/${subject.id}/edit/${page.id}`}
                      className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 flex items-center justify-center text-indigo-500 hover:text-indigo-700 transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

