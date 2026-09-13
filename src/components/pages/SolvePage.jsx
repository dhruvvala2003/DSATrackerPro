import { useEffect, useMemo, useState } from 'react'
import { Search, Filter, Edit2, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../common/Loading'
import { motion, AnimatePresence } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
}

export default function SolvePage() {
  const [topics, setTopics] = useState([])
  const [subtopics, setSubtopics] = useState([])
  const [problems, setProblems] = useState([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedSubtopic, setSelectedSubtopic] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleDeleteProblem = async (problemId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('problems')
        .delete()
        .eq('id', problemId)

      if (error) throw error

      setProblems((current) => current.filter((problem) => problem.id !== problemId))
    } catch (deleteError) {
      setError(deleteError?.message || 'Unable to delete this question.')
    }
  }

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [{ data: topicData, error: topicError }, { data: subtopicData, error: subtopicError }] = await Promise.all([
          supabase.from('topics').select('id, name, description').order('name'),
          supabase.from('subtopics').select('id, topic_id, name, description').order('name'),
        ])

        if (topicError || subtopicError) {
          const requestError = topicError || subtopicError
          setError(requestError.code === '42501' ? 'Supabase blocked the explorer read. Run the SELECT policies in supabase-policies.sql.' : requestError.message)
        }

        const allProblemsResponse = await supabase
          .from('problems')
          .select('id, subtopic_id, title, difficulty, status, companies')
          .order('title')

        if (allProblemsResponse.error) {
          if (allProblemsResponse.error.message?.toLowerCase().includes('companies')) {
            const fallbackResponse = await supabase
              .from('problems')
              .select('id, subtopic_id, title, difficulty, status')
              .order('title')
            setProblems(fallbackResponse.data || [])
          } else {
            setError(allProblemsResponse.error.code === '42501'
              ? 'Supabase blocked the explorer read. Run the SELECT policies in supabase-policies.sql.'
              : allProblemsResponse.error.message)
          }
        } else {
          setProblems(allProblemsResponse.data || [])
        }

        setTopics(topicData || [])
        setSubtopics(subtopicData || [])
      } catch (caughtError) {
        setError(caughtError?.message || 'Unable to load the question list.')
      } finally {
        setLoading(false)
      }
    }
    queueMicrotask(loadContent)
  }, [])

  const companyOptions = useMemo(() => {
    return Array.from(new Set(problems.flatMap((problem) => problem.companies || []))).sort((left, right) => left.localeCompare(right))
  }, [problems])

  const visibleSubtopics = useMemo(() => {
    if (!selectedTopic) return subtopics
    return subtopics.filter((item) => String(item.topic_id) === String(selectedTopic))
  }, [selectedTopic, subtopics])

  const rows = useMemo(() => {
    return problems.map((problem) => {
      const subtopic = subtopics.find((item) => String(item.id) === String(problem.subtopic_id)) || null
      const topic = topics.find((item) => String(item.id) === String(subtopic?.topic_id)) || null

      return {
        id: problem.id,
        topic,
        subtopic,
        title: problem.title,
        difficulty: problem.difficulty || 'Medium',
        status: problem.status || 'Not Started',
        companies: problem.companies || [],
      }
    })
  }, [problems, subtopics, topics])

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesTopic = !selectedTopic || (row.topic && String(row.topic.id) === String(selectedTopic))
      const matchesSubtopic = !selectedSubtopic || (row.subtopic && String(row.subtopic.id) === String(selectedSubtopic))
      const matchesCompany = !selectedCompany || (row.companies || []).includes(selectedCompany)
      const matchesSearch = !normalizedSearch || `${row.title || ''} ${row.subtopic?.name || ''} ${row.topic?.name || ''}`.toLowerCase().includes(normalizedSearch)

      return matchesTopic && matchesSubtopic && matchesCompany && matchesSearch
    })
  }, [rows, selectedCompany, selectedSubtopic, selectedTopic, search])

  const getDifficultyStyles = (difficulty) => {
    const diff = difficulty?.toLowerCase() || 'easy'
    if (diff === 'easy') return "bg-emerald-50 text-emerald-600 border-emerald-200"
    if (diff === 'medium') return "bg-amber-50 text-amber-600 border-amber-200"
    if (diff === 'hard') return "bg-rose-50 text-rose-600 border-rose-200"
    return "bg-slate-100 text-slate-600 border-slate-200"
  }

  if (loading) return <Loading />

  return (
    <motion.div 
      className="w-full max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="flex-1">
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Practice Library</span>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
            Start Solving
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-lg text-slate-600 max-w-2xl">
            Explore every question in one view. Filter by topic, pattern, company, or the problem title.
          </motion.p>
        </div>
        
        <motion.div variants={itemVariants}>
          <Link to="/admin/add" className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:-translate-y-0.5">
            Add Problem
          </Link>
        </motion.div>
      </div>

      {error && (
        <motion.div variants={itemVariants} className="mb-8 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </motion.div>
      )}

      {/* Modern Filter Bar */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="relative group flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Search problems..." 
            className="w-full h-12 pl-11 pr-4 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none rounded-xl hover:bg-slate-50 focus:bg-slate-50 transition-colors"
          />
        </div>
        
        <div className="relative">
          <select 
            value={selectedTopic} 
            onChange={(e) => { setSelectedTopic(e.target.value); setSelectedSubtopic(''); }}
            className="w-full h-12 px-4 appearance-none bg-transparent text-sm text-slate-600 outline-none rounded-xl hover:bg-slate-50 focus:bg-slate-50 transition-colors cursor-pointer border-l border-slate-100"
          >
            <option value="" className="bg-white text-slate-900">All Topics</option>
            {topics.map((topic) => <option key={topic.id} value={topic.id} className="bg-white text-slate-900">{topic.name}</option>)}
          </select>
          <Filter size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select 
            value={selectedSubtopic} 
            onChange={(e) => setSelectedSubtopic(e.target.value)}
            disabled={!visibleSubtopics.length}
            className="w-full h-12 px-4 appearance-none bg-transparent text-sm text-slate-600 outline-none rounded-xl hover:bg-slate-50 focus:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-l border-slate-100"
          >
            <option value="" className="bg-white text-slate-900">All Subtopics</option>
            {visibleSubtopics.map((subtopic) => <option key={subtopic.id} value={subtopic.id} className="bg-white text-slate-900">{subtopic.name}</option>)}
          </select>
          <Filter size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select 
            value={selectedCompany} 
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full h-12 px-4 appearance-none bg-transparent text-sm text-slate-600 outline-none rounded-xl hover:bg-slate-50 focus:bg-slate-50 transition-colors cursor-pointer border-l border-slate-100"
          >
            <option value="" className="bg-white text-slate-900">All Companies</option>
            {companyOptions.map((company) => <option key={company} value={company} className="bg-white text-slate-900">{company}</option>)}
          </select>
          <Filter size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </motion.div>

      {/* Explorer Table */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-600">Showing {filteredRows.length} Problem{filteredRows.length !== 1 ? 's' : ''}</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium w-1/4">Problem</th>
                <th className="px-6 py-4 font-medium hidden md:table-cell w-1/5">Subtopic</th>
                <th className="px-6 py-4 font-medium w-1/6">Difficulty</th>
                <th className="px-6 py-4 font-medium hidden lg:table-cell w-1/5">Companies</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredRows.map((row) => (
                  <motion.tr 
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <Link to={`/problem/${row.id}`} className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate block">
                        {row.title}
                      </Link>
                      <div className="text-xs text-slate-500 mt-1 md:hidden truncate">
                        {row.subtopic?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell truncate">
                      {row.subtopic?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded border text-xs font-semibold ${getDifficultyStyles(row.difficulty)}`}>
                        {row.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell truncate">
                      {row.companies?.length ? (
                        <div className="flex gap-2">
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-xs truncate max-w-[120px]">
                            {row.companies[0]}
                          </span>
                          {row.companies.length > 1 && (
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-xs">
                              +{row.companies.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                          to={`/admin/add?mode=edit&problemId=${row.id}`}
                          className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          <Edit2 size={14} />
                        </Link>
                        <button 
                          onClick={() => handleDeleteProblem(row.id)}
                          className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-100 flex items-center justify-center text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <Search size={32} className="text-slate-300" />
                      <p>No matching questions found.</p>
                      <button onClick={() => { setSearch(''); setSelectedTopic(''); setSelectedSubtopic(''); setSelectedCompany(''); }} className="text-sm text-indigo-600 hover:text-indigo-700">
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  )
}
