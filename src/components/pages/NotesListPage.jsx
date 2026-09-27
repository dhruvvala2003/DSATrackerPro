import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Clock, FileText, ImageIcon, Pencil, Plus, Search, Trash2, Video } from 'lucide-react'
import Loading from '../common/Loading'
import { UNTITLED, deletePage, fetchPageList, fetchSubject } from '../../lib/notesApi'
import { countMedia, extractText, findFirstImage } from '../../lib/noteContent'
import { toast } from '../../lib/toast'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
}

const titleOf = (page) => (page.title && page.title !== UNTITLED ? page.title : 'Untitled')

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMin = Math.floor((now - d) / 60000)
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
        const [subjectData, pagesData] = await Promise.all([
          fetchSubject(subjectId, controller.signal),
          fetchPageList(subjectId, { withContent: true, signal: controller.signal }),
        ])
        if (controller.signal.aborted) return
        setSubject(subjectData)
        setPages(pagesData.map((page) => ({
          ...page,
          preview: extractText(page.content, 180),
          cover: findFirstImage(page.content),
          media: countMedia(page.content),
        })))
      } catch (err) {
        if (!controller.signal.aborted) console.error('Error fetching data:', err)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [subjectId])

  const handleDelete = async (page) => {
    if (!window.confirm(`Delete "${titleOf(page)}"? This cannot be undone.`)) return
    const previous = pages
    setPages((current) => current.filter((p) => p.id !== page.id))
    try {
      await deletePage(page.id)
      toast.success('Page deleted')
    } catch (err) {
      console.error('Delete error:', err)
      setPages(previous)
      toast.error('Couldn’t delete the page', { description: err.message })
    }
  }

  const query = search.trim().toLowerCase()
  const filteredPages = pages.filter((p) => !query || titleOf(p).toLowerCase().includes(query) || p.preview.toLowerCase().includes(query))

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
            <span className="text-sm font-semibold text-slate-700">Subject</span>
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
              ? `Create your first page in ${subject.name}. Add text, code, photos and videos — everything saves automatically.`
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
          {filteredPages.map((page) => {
            const pageNumber = pages.indexOf(page) + 1
            return (
              <motion.div key={page.id} variants={itemVariants}>
                <div className="group relative flex flex-col h-full rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-violet-300 transition-all duration-300 overflow-hidden">
                  <Link to={`/notes/subject/${subject.id}/read/${page.id}`} className="flex flex-col flex-1" aria-label={`Read ${titleOf(page)}`}>
                    {page.cover ? (
                      <div className="h-36 overflow-hidden bg-slate-100">
                        <img src={page.cover} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                    <div className="flex flex-col flex-1 p-5 relative">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-300 select-none">PAGE {pageNumber}</span>
                        <span className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                          {page.media.images > 0 && <span className="inline-flex items-center gap-1"><ImageIcon size={12} /> {page.media.images}</span>}
                          {page.media.videos > 0 && <span className="inline-flex items-center gap-1"><Video size={12} /> {page.media.videos}</span>}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-violet-600 transition-colors line-clamp-2">
                        {titleOf(page)}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 flex-1">
                        {page.preview || <span className="italic text-slate-400">Empty page</span>}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Clock size={12} />
                      {formatDate(page.updated_at || page.created_at)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(page)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete page"
                        aria-label={`Delete ${titleOf(page)}`}
                      >
                        <Trash2 size={14} />
                      </button>
                      <Link
                        to={`/notes/subject/${subject.id}/edit/${page.id}`}
                        className="h-8 px-3 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                      >
                        <Pencil size={12} /> Edit
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
