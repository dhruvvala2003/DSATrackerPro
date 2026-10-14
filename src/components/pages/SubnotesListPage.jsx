import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Folder,
  Layers,
  Plus,
  Search,
  Trash2,
  ChevronRight,
  FileText,
  Pencil
} from 'lucide-react'
import Loading from '../common/Loading'
import { fetchSubject, fetchSubnotes, createSubnote, deleteSubnote, updateSubnote } from '../../lib/notesApi'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SubnotesListPage() {
  const { subjectId } = useParams()
  const [subject, setSubject] = useState(null)
  const [subnotes, setSubnotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const loadData = async () => {
      try {
        const [subjectData, subnotesData] = await Promise.all([
          fetchSubject(subjectId, controller.signal),
          fetchSubnotes(subjectId, controller.signal),
        ])
        if (controller.signal.aborted) return
        setSubject(subjectData)
        setSubnotes(subnotesData || [])
      } catch (err) {
        if (!controller.signal.aborted) console.error('Error fetching subnotes:', err)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadData()
    return () => controller.abort()
  }, [subjectId])

  const handleCreateSubnote = async () => {
    const name = window.prompt(
      `Enter sub-note name for "${subject?.name || 'this note'}":`,
      subject?.name ? `${subject.name} - Part 1` : ''
    )
    if (!name || !name.trim()) return

    try {
      const newSubnote = await createSubnote(subjectId, name.trim())
      if (newSubnote) {
        setSubnotes((current) => [...current, { ...newSubnote, pageCount: 0 }])
      }
    } catch (err) {
      console.error('Error creating subnote:', err)
      alert('Failed to create subnote. Please check database permissions.')
    }
  }

  const handleRename = async (subnote) => {
    const newName = window.prompt(`Rename sub-note "${subnote.name}":`, subnote.name)
    if (!newName || !newName.trim() || newName.trim() === subnote.name) return

    try {
      const updated = await updateSubnote(subnote.id, { name: newName.trim() })
      if (updated) {
        setSubnotes((current) =>
          current.map((sn) => (sn.id === subnote.id ? { ...sn, name: updated.name } : sn))
        )
      }
    } catch (err) {
      console.error('Error renaming subnote:', err)
      alert('Failed to rename sub-note.')
    }
  }

  const handleDelete = async (subnoteId, subnoteName) => {
    if (
      !window.confirm(
        `Delete sub-note "${subnoteName}" and ALL pages inside it? This cannot be undone.`
      )
    )
      return

    try {
      await deleteSubnote(subnoteId)
      setSubnotes((current) => current.filter((sn) => sn.id !== subnoteId))
    } catch (err) {
      console.error('Delete subnote error:', err)
      alert('Failed to delete sub-note.')
    }
  }

  const filteredSubnotes = subnotes.filter(
    (sn) =>
      !search.trim() || sn.name.toLowerCase().includes(search.toLowerCase().trim())
  )

  if (loading) return <Loading />

  return (
    <motion.div
      className="w-full max-w-6xl mx-auto pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header and Breadcrumbs */}
      <motion.div variants={itemVariants} className="mb-10">
        <Link
          to="/notes"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-6 group text-sm font-medium"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to all notes
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-4">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-sm font-semibold text-slate-700">Notebook</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-2">
              {subject?.name || 'Notes'}
            </h1>
            <p className="text-base text-slate-600 max-w-2xl">
              {subject?.description || 'Sub-notes and sections inside this notebook.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateSubnote}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:-translate-y-0.5"
            >
              <Plus size={18} />
              New Sub-note
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      {subnotes.length > 0 && (
        <motion.div variants={itemVariants} className="flex gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sub-notes..."
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
            />
          </div>
        </motion.div>
      )}

      {/* Subnotes Grid */}
      {filteredSubnotes.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-sm"
        >
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 mb-4">
            <Layers size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {subnotes.length === 0 ? 'No sub-notes yet' : 'No matching sub-notes'}
          </h2>
          <p className="text-slate-500 mb-6 max-w-sm">
            {subnotes.length === 0
              ? `Create your first sub-note inside "${subject?.name || 'this note'}" to start organizing pages.`
              : 'Try a different search term.'}
          </p>
          {subnotes.length === 0 && (
            <button
              onClick={handleCreateSubnote}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-md"
            >
              <Plus size={18} /> Create First Sub-note
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredSubnotes.map((subnote) => (
            <motion.div key={subnote.id} variants={itemVariants}>
              <Link
                to={`/notes/subject/${subjectId}/subnote/${subnote.id}`}
                className="group block h-full"
              >
                <div className="flex flex-col h-full p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-300 relative overflow-hidden">
                  {/* Subtle top-right glow */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                      <Layers size={22} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleRename(subnote)
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-indigo-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Rename Sub-note"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDelete(subnote.id, subnote.name)
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors"
                        title="Delete Sub-note"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors relative z-10 line-clamp-1">
                    {subnote.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-3 relative z-10">
                    <FileText size={13} className="text-indigo-500" />
                    <span>
                      {subnote.pageCount || 0} {subnote.pageCount === 1 ? 'Page' : 'Pages'}
                    </span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium relative z-10">
                    <span>{formatDate(subnote.created_at)}</span>
                    <span className="flex items-center gap-1 group-hover:text-indigo-600 transition-colors font-semibold">
                      Open <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
