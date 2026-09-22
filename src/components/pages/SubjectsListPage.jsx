import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'
import { Plus, Folder, Trash2, ChevronRight, Search } from 'lucide-react'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SubjectsListPage() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const fetchSubjects = async () => {
      try {
        const { data, error } = await supabase
          .from('notes_subjects')
          .select('*')
          .order('created_at', { ascending: false })
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        if (error) throw error
        setSubjects(data || [])
      } catch (err) {
        if (!controller.signal.aborted) console.error('Error fetching subjects:', err)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchSubjects()
    return () => controller.abort()
  }, [])

  const handleCreateSubject = async () => {
    const name = window.prompt("Enter subject name (e.g., 'SQL', 'System Design'):")
    if (!name || !name.trim()) return

    try {
      const { data, error } = await supabase
        .from('notes_subjects')
        .insert({ name: name.trim() })
        .select()
        .single()
      
      if (error) throw error
      if (data) {
        setSubjects([data, ...subjects])
      }
    } catch (err) {
      console.error('Error creating subject:', err)
      alert('Failed to create subject.')
    }
  }

  const handleDelete = async (subjectId, subjectName) => {
    if (!window.confirm(`Delete "${subjectName}" and ALL its notes? This cannot be undone.`)) return
    try {
      const { error } = await supabase.from('notes_subjects').delete().eq('id', subjectId)
      if (error) throw error
      setSubjects((current) => current.filter((s) => s.id !== subjectId))
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete subject.')
    }
  }

  const filteredSubjects = subjects.filter(s => 
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Loading />

  return (
    <motion.div
      className="w-full max-w-6xl mx-auto pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-sm font-semibold text-slate-700">Knowledge Base</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
            Subjects
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Organize your notes into dedicated projects and subjects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateSubject}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:-translate-y-0.5"
          >
            <Plus size={18} />
            New Subject
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      {subjects.length > 0 && (
        <motion.div variants={itemVariants} className="flex gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects..."
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
            />
          </div>
        </motion.div>
      )}

      {/* Subjects Grid */}
      {filteredSubjects.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 mb-4">
            <Folder size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {subjects.length === 0 ? 'No subjects yet' : 'No matching subjects'}
          </h2>
          <p className="text-slate-500 mb-6 max-w-sm">
            {subjects.length === 0
              ? 'Create your first subject to start organizing your notes.'
              : 'Try a different search term.'}
          </p>
          {subjects.length === 0 && (
            <button onClick={handleCreateSubject} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-md">
              <Plus size={18} /> Create First Subject
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredSubjects.map((subject) => (
            <motion.div key={subject.id} variants={itemVariants}>
              <Link to={`/notes/subject/${subject.id}`} className="group block h-full">
                <div className="flex flex-col h-full p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-300 relative overflow-hidden">
                  
                  {/* Hover styling */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:bg-indigo-100 transition-all">
                      <Folder size={24} />
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); handleDelete(subject.id, subject.name) }}
                      className="w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Subject"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors relative z-10 line-clamp-1">
                    {subject.name}
                  </h3>
                  
                  <div className="mt-auto pt-4 flex items-center justify-between text-xs text-slate-400 font-medium relative z-10">
                    <span>{formatDate(subject.created_at)}</span>
                    <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors">
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
